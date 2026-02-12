// WISMO Widget - Native, Smart & Upsell
(function() {
  const container = document.getElementById('wismo-root');
  if (!container) return;

  // Defaults + Liquid Settings
  const CONFIG = window.WISMO_CONFIG || { 
    apiUrl: '/apps/track', 
    supportEmail: 'support@example.com',
    showPredictiveText: true
  };

  // Render Form
  container.innerHTML = `
    <form id="wismo-form" class="wismo-form">
      <div class="wismo-field">
        <label for="wismo-order">Order Number</label>
        <input type="text" id="wismo-order" placeholder="#1001" required>
      </div>
      <div class="wismo-field">
        <label for="wismo-email">Email Address</label>
        <input type="email" id="wismo-email" placeholder="you@example.com" required>
      </div>
      <button type="submit" id="wismo-submit">Track Order</button>
      
      <!-- Smart Message Area -->
      <div id="wismo-message" class="wismo-message" style="display:none;"></div>
      <div id="wismo-result" class="wismo-result" style="display:none;"></div>
      <div id="wismo-upsell" class="wismo-upsell" style="display:none;"></div>
      
      ${CONFIG.showPredictiveText ? `
        <p style="font-size: 0.85em; color: #666; text-align: center; margin-top: 15px;">
          Note: Tracking updates may take 24-48 hours to appear after shipment.
        </p>
      ` : ''}
    </form>
  `;

  const form = document.getElementById('wismo-form');
  const submitBtn = document.getElementById('wismo-submit');
  const msgDiv = document.getElementById('wismo-message');
  const resultDiv = document.getElementById('wismo-result');
  const upsellDiv = document.getElementById('wismo-upsell');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';
    msgDiv.style.display = 'none';
    resultDiv.style.display = 'none';
    upsellDiv.style.display = 'none'; // Hide upsells initially
    resultDiv.innerHTML = '';
    upsellDiv.innerHTML = '';

    const orderNum = document.getElementById('wismo-order').value;
    const email = document.getElementById('wismo-email').value;

    try {
      const url = `${CONFIG.apiUrl}?orderName=${encodeURIComponent(orderNum)}&email=${encodeURIComponent(email)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.found) {
        renderResult(data);
        
        // Render Upsell if Available
        if (data.upsell && data.upsell.products && data.upsell.products.length > 0) {
            renderUpsell(data.upsell);
        }
      } else {
        // Smart Error Handling: Direct to Support
        showError(`
          We couldn't find order <strong>${orderNum}</strong> with that email.<br>
          Check your spelling or <a href="mailto:${CONFIG.supportEmail}?subject=Help with Order ${orderNum}" style="text-decoration:underline;">contact support</a>.
        `);
      }
    } catch (err) {
      console.error('WISMO Error:', err);
      showError('Unable to connect. Please try again in a moment.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Track Order';
    }
  });

  function showError(htmlMsg) {
    msgDiv.innerHTML = htmlMsg; 
    msgDiv.className = 'wismo-message wismo-error';
    msgDiv.style.display = 'block';
  }

  function renderResult(data) {
    let trackingHtml = '';
    if (data.tracking) {
      trackingHtml = `
        <div class="wismo-tracking-info">
          <p><strong>Tracking:</strong> ${data.tracking.carrier}</p>
          <a href="${data.tracking.url}" target="_blank" class="wismo-track-btn">
            ${data.tracking.number} &rarr;
          </a>
        </div>
      `;
    }

    let statusClass = 'pending';
    if (data.status === 'FULFILLED') statusClass = 'fulfilled';
    if (data.status === 'CANCELED') statusClass = 'canceled';

    resultDiv.innerHTML = `
      <div class="wismo-status-badge ${statusClass}">
        ${data.status}
      </div>
      ${trackingHtml}
      ${data.estimatedDelivery ? `<p class="wismo-date">Expected: ${data.estimatedDelivery}</p>` : ''}
    `;
    resultDiv.style.display = 'block';
  }

  function renderUpsell(upsellData) {
      let productsHtml = upsellData.products.map(p => `
        <div class="wismo-product-card" style="border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
            <img src="${p.image}" alt="${p.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
            <div style="flex-grow: 1;">
                <h4 style="margin: 0; font-size: 0.95em;">${p.title}</h4>
                <p style="margin: 0; font-size: 0.85em; color: #666;">${p.price}</p>
            </div>
            <a href="${p.url}" class="wismo-buy-btn" style="background: #008060; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 0.8em; font-weight: bold;">Buy</a>
        </div>
      `).join('');

      upsellDiv.innerHTML = `
        <h3 style="margin-top: 20px; font-size: 1.1em; text-align: center;">${upsellData.title}</h3>
        <div class="wismo-product-grid">
            ${productsHtml}
        </div>
      `;
      upsellDiv.style.display = 'block';
  }
})();
