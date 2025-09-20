import json
import numpy as np
from sklearn.linear_model import LinearRegression

# 1. Load CO₂ Data from JSON
with open("co2_history.json", "r") as f:
    history_data = json.load(f)

# Expected structure: [{"date": "YYYY-MM-DD", "co2": value_in_grams}, ...]
co2_data = []
for i, entry in enumerate(history_data):
    co2_value = entry.get("totals", {}).get("co2", 0)
    co2_data.append((i, co2_value))

# 2. Prepare Data for Training
X = np.array([d[0] for d in co2_data]).reshape(-1, 1)  # days index
y = np.array([d[1] for d in co2_data])  # CO₂ grams

# 3. Train Linear Regression
model = LinearRegression()
model.fit(X, y)

m = model.coef_[0]    # slope
b = model.intercept_  # intercept