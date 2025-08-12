# train_model.py
import json
import numpy as np
from sklearn.linear_model import LinearRegression

# -----------------------------
# 1. Load Fake CO₂ Data from JSON
# -----------------------------
with open("co2_history.json", "r") as f:
    history_data = json.load(f)

# Expected structure: [{"date": "YYYY-MM-DD", "co2": value_in_grams}, ...]
# If your stored data uses a different key, adjust here:
co2_data = []
for i, entry in enumerate(history_data):
    co2_value = entry.get("totals", {}).get("co2", 0)  # change "co2" if your key is different
    co2_data.append((i, co2_value))

# -----------------------------
# 2. Prepare Data for Training
# -----------------------------
X = np.array([d[0] for d in co2_data]).reshape(-1, 1)  # days index
y = np.array([d[1] for d in co2_data])  # CO₂ grams

# -----------------------------
# 3. Train Linear Regression
# -----------------------------
model = LinearRegression()
model.fit(X, y)

m = model.coef_[0]    # slope
b = model.intercept_  # intercept

# -----------------------------
# 4. Output JS Code
# -----------------------------
print("// Paste this into background.js")
print(f"const CO2_MODEL = {{ m: {m:.4f}, b: {b:.4f} }};")
print("""
function predictFutureCO2(daysAhead) {
    return CO2_MODEL.m * daysAhead + CO2_MODEL.b;
}
""")
