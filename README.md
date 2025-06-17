
# 🛡️ Phishing Guard – AI-Powered Chrome Extension

Phishing Guard is a Chrome Extension that uses a machine learning model hosted in a Flask backend to detect potentially malicious or phishing websites in real-time as users browse the web.

---

## 📁 Project Structure

```
phishing-guard/
├── chrome_extension/
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   ├── manifest.json
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── flask_backend/
│   ├── app.py
│   ├── feature.py
│   └── pickle/
│       └── model.pkl
└── README.md
```

---

## 🛠️ Setup Instructions

### 🔧 1. Clone or Download the Repository

```bash
git clone https://github.com/yourusername/phishing-guard.git
cd phishing-guard
```

---

### 🧪 2. Setup Python Backend

#### a. Navigate to the backend directory:
```bash
cd flask_backend
```

#### b. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

#### c. Install dependencies:
```bash
pip install -r requirements.txt
```

If `requirements.txt` doesn't exist, install manually:
```bash
pip install flask flask-cors numpy pandas scikit-learn beautifulsoup4 requests python-whois googlesearch-python
```

#### d. Run the Flask server:
```bash
python app.py
```

- The server will start at: `http://localhost:5000`
- Ensure the ML model is present at: `pickle/model.pkl`

---

### 🌐 3. Load Chrome Extension

1. Open **Chrome** and go to: `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **"Load unpacked"**
4. Select the `chrome_extension/` directory
5. The **Phishing Guard** extension should now appear in your browser.

---

## 🧩 How It Works

- The extension monitors URL changes using `background.js`
- On each new page visit, it:
  - Sends the URL to Flask backend (`http://localhost:5000/check`)
  - Flask extracts 30+ features via `feature.py` and predicts with a pickled ML model
  - Response includes a `safety_score`, which is used to:
    - Update badge icon
    - Display warnings via `content.js`
    - Show a detailed status in the popup (`popup.html` + `popup.js`)

---

## 🧪 Test It Out

Try visiting a few websites like:
- ✅ https://www.google.com
- ❌ http://example-phishing-site.com *(fake test domain)*

---

## ✅ Troubleshooting

- ❌ **Error: `Object of type bool is not JSON serializable`**  
  ➤ Ensure you're converting all `np.bool_` or other non-native types in `app.py`:
  ```python
  'is_safe': bool(is_safe)
  ```

- ❌ **CORS issue or connection refused**  
  ➤ Make sure the Flask server is **running and accessible at `http://localhost:5000`**.

---

## 📩 Reporting

Click the `📋 Report` button in the popup to send suspicious sites via email.

---

## 🔒 Privacy & Security

- All data is processed locally.
- The extension **does not track or log** user activity.
- Only active tabs are analyzed when permission is granted.

---

## 📌 Future Enhancements

- Auto model updating from cloud
- Logging/reporting dashboard for system admins
- Full deployment with HTTPS and domain hosting

---

## 🧑‍💻 Author

Made with 💡 by [Your Name]

---

## 📜 License

MIT License
