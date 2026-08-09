import os
import httpx
import json

class LLMService:
    def __init__(self):
        self.api_key = os.environ.get('LLM_API_KEY', '')

    def generate_underwriting_summary(self, risk_score: int, decision: str, top_explanations: list) -> str:
        """
        Phase 14: LLM Underwriting Explanation.
        Sends structured prediction results to Gemini to compile a professional, two-sentence narrative.
        Implements a deterministic fallback template if the API key is missing or fails.
        """
        # If API key is missing, immediately use the fallback template
        if not self.api_key:
            return self._generate_fallback(risk_score, decision, top_explanations)
            
        # Clean explanations for prompt
        factors_str = "\n".join([f"- {exp}" for exp in top_explanations])
        
        prompt = f"""You are a professional fintech assistant underwriting analyst. 
Your role is strictly to translate the following structured credit risk model outputs into a concise, professional, two-sentence natural language narrative summary for an internal loan officer review dashboard.

Crucial Constraints:
1. You must NOT change, contradict, or override the model's decision or numeric findings. The ML model is the authoritative decision maker.
2. Under no circumstances should you recommend an approval if the model recommends DECLINE, or vice versa.
3. Keep the output strictly to exactly two sentences. Do not add salutations, greetings, or metadata.
4. Keep the tone professional, objective, and institutional.

Input Data:
- Risk Score: {risk_score} / 100 (where 0 is lowest risk, 100 is highest risk)
- Model Decision: {decision}
- Principal Risk Factors:
{factors_str}

Output (Strictly 2 sentences):"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 100,
                "temperature": 0.2
            }
        }
        
        try:
            # Synchronous HTTP post with 3s timeout
            response = httpx.post(url, headers=headers, json=payload, timeout=3.0)
            if response.status_code == 200:
                resp_json = response.json()
                text = resp_json['candidates'][0]['content']['parts'][0]['text']
                return text.strip()
            else:
                print(f"Gemini API returned error code {response.status_code}. Using fallback.")
                return self._generate_fallback(risk_score, decision, top_explanations)
        except Exception as e:
            print(f"Gemini API connection error: {e}. Using fallback.")
            return self._generate_fallback(risk_score, decision, top_explanations)

    def _generate_fallback(self, risk_score: int, decision: str, top_explanations: list) -> str:
        """
        Deterministic, professional fallback generator.
        """
        # Parse top factor messages to build narrative
        factors_clean = []
        for exp in top_explanations:
            # Strip impact/effect details for smooth reading
            clean = exp.split(" increased")[0].split(" reduced")[0].strip()
            factors_clean.append(clean.lower())
            
        if len(factors_clean) < 3:
            factors_clean = ["income level", "requested loan size", "employment history"]
            
        # Capitalize first
        fact1 = factors_clean[0]
        fact2 = factors_clean[1]
        fact3 = factors_clean[2]
        
        if decision == "APPROVE":
            sentence_1 = f"The applicant presents relatively low predicted default risk (Risk Score: {risk_score}/100), supported by a stable credit profile."
            sentence_2 = f"Primary underwriting factors indicate that positive markers such as {fact2} and {fact3} mitigate secondary risks associated with {fact1}."
        else:
            sentence_1 = f"The credit application is recommended for decline due to elevated default probability (Risk Score: {risk_score}/100)."
            sentence_2 = f"Underwriting indicators show that {fact1} and {fact2} contribute significantly to the risk profile, exceeding acceptable credit policy thresholds."
            
        return f"{sentence_1} {sentence_2}"
