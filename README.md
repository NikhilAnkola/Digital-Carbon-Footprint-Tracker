# Digital Carbon Footprint Tracker 🌍♻️

A Chrome Browser Extension designed to monitor and estimate the **digital carbon footprint** generated through daily online activities such as video streaming, browsing, and conferencing.

The project combines **Machine Learning + Rule-Based AI + Gamification** to help users understand, predict, and reduce their digital carbon emissions while promoting sustainable digital behavior.

---

## 📌 Project Overview

With the rapid growth of digital services, activities like streaming videos, browsing websites, attending online meetings, and cloud usage contribute significantly to hidden carbon emissions.

This project aims to:

- Track browser-based digital activities
- Estimate CO₂ emissions in real time
- Predict future emissions using Machine Learning
- Provide AI-based personalized suggestions
- Encourage sustainable habits using gamification

The system is implemented as a lightweight **Chrome Extension** using **Manifest V3 Architecture**.

---

## 🚀 Features

### 🔍 Real-Time Activity Monitoring
Tracks browser usage such as:

- Video Streaming
- General Browsing
- Conferencing
- High-data websites

without storing personal content or private browsing data.

---

### 🌱 Carbon Emission Estimation

Calculates estimated CO₂ emissions using:

- Data usage patterns
- Website category
- Streaming duration
- Regional electricity emission factors (Ember Climate Data)

This helps users visualize the environmental impact of their digital behavior.

---

### 📈 CO₂ Prediction using Machine Learning

A **Linear Regression Model** predicts short-term future emissions based on historical browsing patterns.

This allows users to proactively manage their carbon footprint instead of reacting afterward.

---

### 🤖 Rule-Based AI Suggestions

Provides personalized recommendations like:

- Reduce video quality from 1080p to 720p
- Limit unnecessary background tabs
- Reduce excessive streaming time
- Prefer low-data alternatives

These suggestions help users adopt eco-friendly browsing habits.

---

### 🎮 Gamification System

To improve long-term engagement, the extension includes:

#### 🔥 Streaks
Maintain low daily emissions to build eco-streaks.

#### 🏆 Eco Points
Earn points for sustainable digital behavior.

#### 🌳 Virtual Garden
Grow trees, plants, and seedlings based on eco-points.

This transforms sustainability into a motivating daily habit.

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend Logic
- Chrome Extension APIs
- Manifest V3
- Local JSON Storage

### Machine Learning
- Python
- NumPy
- Scikit-learn
- Linear Regression

### Data Source
- Ember Climate – India Electricity Emission Factors

---

## 📂 Project Structure

```bash
Digital-Carbon-Footprint-Tracker/
│
├── icons/
├── libs/
│
├── background.js
├── content_video.js
├── dashboard.html
├── dashboard.css
├── dashboard.js
├── dashboard-charts.js
├── gamification.js
├── rule_suggestions.js
├── manifest.json
├── train_model.py
│
└── README.md
```

---

## ⚙️ Installation Guide
### Step 1: Clone the Repository
git clone https://github.com/your-username/Digital-Carbon-Footprint-Tracker.git

### Step 2: Open Chrome Extensions
Go to: chrome://extensions/
Enable: Developer Mode (top-right corner)

### Step 3: Load Unpacked Extension
Click: Load Unpacked and select the project folder.

### Step 4: Start Using
The extension will begin monitoring browser activity and display:

- Carbon footprint dashboard
- Emission trends
- Predictions
- AI suggestions
- Gamification progress

---

## 📊 Research Paper
This project is based on our research paper:

A Hybrid AI Framework for Digital Carbon Footprint Tracking
The paper focuses on:

Browser-level carbon monitoring

ML-based emission forecasting

Rule-based sustainability recommendations

Gamification-driven behavioral reinforcement

---

## 📷 Dashboard Highlights
Includes:
Today's CO₂ Summary

Previous 7 Days Usage

Previous 28 Days History

CO₂ Prediction Graph

Gamification Dashboard

State-wise Carbon Intensity Comparison

---

## 🔐 Privacy & Security
The extension prioritizes privacy by:

Tracking only anonymized browsing metadata

Not storing personal browsing content

Avoiding sensitive user information collection

This ensures lightweight and privacy-aware sustainability monitoring.

---

## 📈 Future Improvements
Planned future enhancements:

Advanced ML models (Random Forest / XGBoost)

Real-time API-based emission factors

Mobile device integration

Cloud synchronization

Multi-browser support

Personalized sustainability scoring

---

## 👨‍💻 Authors
Shriya Bhambure
Department of Information Technology
Shah and Anchor Kutchhi Engineering College

Nikhil Ankola
Department of Information Technology
Shah and Anchor Kutchhi Engineering College

Guided By
Dr. Vinit Kotak

Dr. Swati Nadkarni

Dr. Rashmi Malvankar

Ms. Chintal Gala

---

## 📜 License
This project is developed for academic and research purposes.

---

## ⭐ If You Like This Project
Please consider giving it a ⭐ on GitHub!

It helps support sustainable technology research 🌍