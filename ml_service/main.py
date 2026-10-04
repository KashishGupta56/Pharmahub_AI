from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="Pharma ML Forecasting & NLP Service", version="1.0.0")

class SaleRecord(BaseModel):
    name: str
    quantity: int
    date: str

class MedicineRecord(BaseModel):
    id: str
    name: str
    company: Optional[str] = "Generic"
    price: float
    stock: int

class ForecastRequest(BaseModel):
    sales: List[SaleRecord]
    medicines: List[MedicineRecord]

class ChatQueryRequest(BaseModel):
    message: str
    medicines: List[MedicineRecord]


# ==========================================
# 1. TIME-SERIES DEMAND FORECASTING (PHASE 4)
# ==========================================
@app.post("/predict-demand")
def train_and_predict(payload: ForecastRequest):
    try:
        meds_df = pd.DataFrame([m.model_dump() for m in payload.medicines])
        sales_df = pd.DataFrame([s.model_dump() for s in payload.sales]) if payload.sales else pd.DataFrame()

        results = []

        if sales_df.empty or "date" not in sales_df.columns:
            for _, m in meds_df.iterrows():
                results.append({
                    "medicine_id": m["id"],
                    "name": m["name"],
                    "current_stock": m["stock"],
                    "daily_velocity": 0.0,
                    "predicted_30d_demand": 0,
                    "projected_revenue": 0.0,
                    "trend": "Stable ➖"
                })
            return {"status": "success", "analytics": results}

        sales_df["date"] = pd.to_datetime(sales_df["date"])
        min_date = sales_df["date"].min()
        sales_df["day_index"] = (sales_df["date"] - min_date).dt.days

        for _, m in meds_df.iterrows():
            med_name = m["name"]
            item_sales = sales_df[sales_df["name"].str.lower() == med_name.lower()]

            if len(item_sales) >= 2:
                daily_agg = item_sales.groupby("day_index")["quantity"].sum().reset_index()
                X = daily_agg[["day_index"]].values
                y = daily_agg["quantity"].values

                model = LinearRegression()
                model.fit(X, y)

                last_day = X.max()
                future_days = np.array([[last_day + i] for i in range(1, 31)])
                raw_pred = model.predict(future_days)

                predicted_demand = int(max(0, np.sum(raw_pred)))
                daily_velocity = round(float(predicted_demand / 30.0), 2)
                trend = "Demand Rising 📈" if model.coef_[0] > 0 else "Demand Falling 📉"
            else:
                total_units = int(item_sales["quantity"].sum()) if not item_sales.empty else 0
                predicted_demand = int(total_units * 1.1)
                daily_velocity = round(float(predicted_demand / 30.0), 2)
                trend = "Stable ➖"

            results.append({
                "medicine_id": m["id"],
                "name": med_name,
                "current_stock": m["stock"],
                "daily_velocity": daily_velocity,
                "predicted_30d_demand": predicted_demand,
                "projected_revenue": round(predicted_demand * m["price"], 2),
                "trend": trend
            })

        return {"status": "success", "analytics": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Engine Error: {str(e)}")


# ==========================================
# 2. NLP TF-IDF & COSINE SIMILARITY (PHASE 5)
# ==========================================
@app.post("/nlp-chat")
def process_chat_query(payload: ChatQueryRequest):
    try:
        meds = payload.medicines
        user_query = payload.message.strip().lower()

        if not meds:
            return {"reply": "Inventory is currently empty."}

        # Symptom Knowledge Graph mapping
        symptom_knowledge = {
            "fever": ["paracetamol", "dolo", "crocin", "calpol", "pcm"],
            "pain": ["zerodol", "combiflam", "ibuprofen", "diclofenac", "paracetamol"],
            "headache": ["disprin", "saridon", "paracetamol", "zerodol"],
            "cold": ["cetirizine", "allegra", "sinarest", "cold"],
            "cough": ["benadryl", "ascoril", "cough", "syrup"],
            "acidity": ["pantoprazole", "omeprazole", "pan", "gelusil", "digene"]
        }

        # Check for symptom match first
        for symptom, matched_drugs in symptom_knowledge.items():
            if symptom in user_query:
                available = [m for m in meds if any(d in m.name.lower() for d in matched_drugs)]
                if available:
                    res_lines = [f"🩺 Detected symptom: **{symptom.capitalize()}**. Recommended available medicines:"]
                    for med in available[:3]:
                        stk_txt = f"{med.stock} units" if med.stock > 0 else "Out of Stock"
                        res_lines.append(f"• **{med.name}** ({med.company}) — ₹{med.price} [{stk_txt}]")
                    return {"reply": "\n".join(res_lines)}

        # Real NLP: TF-IDF Vectorization across Inventory Corpus
        corpus = [f"{m.name} {m.company}".lower() for m in meds]
        vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(corpus)

        query_vec = vectorizer.transform([user_query])
        similarity_scores = cosine_similarity(query_vec, tfidf_matrix).flatten()

        best_index = int(np.argmax(similarity_scores))
        confidence = float(similarity_scores[best_index])

        if confidence > 0.15:
            matched_med = meds[best_index]
            status_text = f"In Stock ({matched_med.stock} units available)" if matched_med.stock > 0 else "Out of Stock"
            return {
                "reply": f"💊 **{matched_med.name}** ({matched_med.company})\n• Price: ₹{matched_med.price}\n• Status: {status_text}\n• NLP Confidence Score: {round(confidence * 100, 1)}%"
            }

        # Fallback greetings
        if any(w in user_query for w in ["hi", "hello", "hey"]):
            return {
                "reply": "Hello! I am your AI Pharmacy Assistant powered by Scikit-Learn NLP. Ask me about medicine prices, stock status, or remedies for symptoms (fever, pain, cough, acidity)."
            }

        return {
            "reply": f"Could not find an exact medical match for '{payload.message}'. Please check spelling or consult pharmacist."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NLP Service Error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)