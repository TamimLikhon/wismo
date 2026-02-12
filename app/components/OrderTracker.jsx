import { useState } from "react";

export function OrderTracker() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call our backend API
      const response = await fetch(`/api/track?orderName=${orderNumber}&email=${email}`);
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || "Could not find order.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wismo-widget" style={{ 
      border: "1px solid #e1e3e5", 
      padding: "20px", 
      borderRadius: "8px", 
      maxWidth: "400px",
      fontFamily: "system-ui, sans-serif"
    }}>
      <h3 style={{ marginTop: 0 }}>Track Your Order</h3>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <label htmlFor="orderNumber" style={{ display: "block", marginBottom: "5px", fontSize: "0.9em" }}>Order Number</label>
          <input
            id="orderNumber"
            type="text"
            placeholder="#1001"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        
        <div>
          <label htmlFor="email" style={{ display: "block", marginBottom: "5px", fontSize: "0.9em" }}>Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: "10px",
            backgroundColor: loading ? "#ccc" : "#008060", // Shopify Green
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold"
          }}
        >
          {loading ? "Checking..." : "Track Order"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: "15px", color: "#d82c0d", backgroundColor: "#fff4f4", padding: "10px", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Status:</strong>
            <span style={{ 
              backgroundColor: "#e4e5e7", 
              padding: "4px 8px", 
              borderRadius: "4px", 
              fontSize: "0.9em" 
            }}>
              {result.status}
            </span>
          </div>
          
          {result.tracking && (
            <div style={{ marginTop: "10px" }}>
              <p style={{ margin: "5px 0", fontSize: "0.9em" }}>
                Tracking: {result.tracking.carrier}
              </p>
              <a 
                href={result.tracking.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: "#008060", textDecoration: "underline", fontSize: "0.9em" }}
              >
                {result.tracking.number}
              </a>
            </div>
          )}
          
          {result.estimatedDelivery && (
             <p style={{ marginTop: "10px", fontSize: "0.9em", color: "#666" }}>
               Expected: {result.estimatedDelivery}
             </p>
          )}
        </div>
      )}
    </div>
  );
}
