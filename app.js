const DEFAULT_REFERENCE_HARVEST_DAYS = 11;
const DEFAULT_BLACK_TRAY_MULTIPLIER = 2.5;
const APP_VERSION = "v1.3.2";
const firebaseSettings = window.firebaseSettings || { enabled: false, config: {}, statePath: "adminPortal/yieldAvailability" };
const migrationData = window.migrationData || { customers: [], orders: [], ordersPath: "" };
const migrationSkuAliases = {
  "brocolli microgreens 45 gms box": "broccoli microgreens 45 gms box",
  "pea shoots microgreens 45 gms box": "peas microgreens 45 gms box",
};

const trayTypes = [
  { id: "green", shortLabel: "GT", name: "Green Tray" },
  { id: "black", shortLabel: "BT", name: "Black Tray" },
];

const companyDetails = {
  name: "Leaf Over Logic",
  address: [
    "Plot No 13, Nehru Vihar, Ring Road Bypass",
    "Near Birla Convent, Kalyanpur East",
    "Lucknow, Uttar Pradesh - 226022",
  ],
  phone: "9631442701",
  website: "www.leafoverlogic.com",
  contactFooter: "Prateek Srivastava, 9631442701, contactus@leafoverlogic.com",
  logoPath: "logo.png",
  account: {
    beneficiary: "Leaf Over Logic Private Limited",
    number: "925020053778448",
    ifsc: "UTIB0004038",
    branch: "Sector K Aliganj",
    bank: "Axis Bank",
  },
};

const today = startOfDay(new Date());
const seedingDates = Array.from({ length: 11 }, (_, index) => addDays(today, index - 3));

const state = createDefaultState();
let cloudSyncEnabled = false;
let isDirty = false;
let editingCustomerId = null;
let editingSkuId = null;
let editingOrderId = null;
let currentInvoiceOrderId = null;

const landingView = document.getElementById("landing-view");
const appView = document.getElementById("app-view");
const appVersionElement = document.getElementById("app-version");
const syncStatusElement = document.getElementById("sync-status");
const saveDataButton = document.getElementById("save-data");
const saveDataHomeButton = document.getElementById("save-data-home");
const backToHomeButton = document.getElementById("back-to-home");
const runMigrationButton = document.getElementById("run-migration");
const activeAppTagElement = document.getElementById("active-app-tag");
const activeAppTitleElement = document.getElementById("active-app-title");
const activeAppSubtitleElement = document.getElementById("active-app-subtitle");

const appPanels = {
  yield: document.getElementById("yield-app"),
  customers: document.getElementById("customers-app"),
  skus: document.getElementById("skus-app"),
  ordering: document.getElementById("ordering-app"),
  analytics: document.getElementById("analytics-app"),
};

const appMeta = {
  yield: { tag: "Yield Availability", title: "Seed planning and projected boxes", subtitle: "Tray planning and crop configuration." },
  customers: { tag: "Customers", title: "Customer management", subtitle: "Capture customer, billing, and chef information." },
  skus: { tag: "SKU", title: "SKU catalog", subtitle: "Maintain pricing and HSN data." },
  ordering: { tag: "Ordering App", title: "Order entry and invoice generation", subtitle: "Save orders first, then generate invoices." },
  analytics: { tag: "Analytics", title: "Sales and demand analytics", subtitle: "Reports based on saved order history." },
};

const collapsibleCards = {
  config: document.querySelector('[data-card="config"]'),
  seeding: document.querySelector('[data-card="seeding"]'),
};

const planningWindowLabelElement = document.getElementById("planning-window-label");
const windowTotalElement = document.getElementById("window-total");
const monthTotalElement = document.getElementById("month-total");
const blackTrayMultiplierInput = document.getElementById("black-tray-multiplier");
const configTable = document.getElementById("config-table");
const seedingTable = document.getElementById("seeding-table");
const boxesTable = document.getElementById("boxes-table");

const customersListElement = document.getElementById("customers-list");
const customerForm = document.getElementById("customer-form");
const chefListElement = document.getElementById("chef-list");
const addChefButton = document.getElementById("add-chef");
const resetCustomerFormButton = document.getElementById("reset-customer-form");
const customerFormTitleElement = document.getElementById("customer-form-title");

const skuListElement = document.getElementById("sku-list");
const skuForm = document.getElementById("sku-form");
const resetSkuFormButton = document.getElementById("reset-sku-form");
const skuFormTitleElement = document.getElementById("sku-form-title");

const orderForm = document.getElementById("order-form");
const orderCustomerSelect = document.getElementById("order-customer");
const orderCustomerNameInput = document.getElementById("order-customer-name");
const orderCustomerCodeInput = document.getElementById("order-customer-code");
const orderDateInput = document.getElementById("order-date");
const orderInvoiceNumberInput = document.getElementById("order-invoice-number");
const orderDueDateInput = document.getElementById("order-due-date");
const orderBillingOrganizationInput = document.getElementById("order-billing-organization");
const orderBillingAddressInput = document.getElementById("order-billing-address");
const orderBillingGstInput = document.getElementById("order-billing-gst");
const orderBillingPhoneInput = document.getElementById("order-billing-phone");
const orderBillingPaymentCycleInput = document.getElementById("order-billing-payment-cycle");
const orderDiscountPercentInput = document.getElementById("order-discount-percent");
const orderItemsElement = document.getElementById("order-items");
const addOrderItemButton = document.getElementById("add-order-item");
const resetOrderFormButton = document.getElementById("reset-order-form");
const ordersListElement = document.getElementById("orders-list");
const invoicePreviewElement = document.getElementById("invoice-preview");
const downloadInvoiceButton = document.getElementById("download-invoice");
const analyticsSales14Element = document.getElementById("analytics-sales-14");
const analyticsSalesMonthElement = document.getElementById("analytics-sales-month");
const analyticsForecastTotalElement = document.getElementById("analytics-forecast-total");
const analyticsDailyChartElement = document.getElementById("analytics-daily-chart");
const analyticsMonthlyChartElement = document.getElementById("analytics-monthly-chart");
const analyticsYearlyChartElement = document.getElementById("analytics-yearly-chart");
const analyticsForecastDaysElement = document.getElementById("analytics-forecast-days");
const analyticsForecastSkusElement = document.getElementById("analytics-forecast-skus");

document.querySelectorAll("[data-open-app]").forEach((button) => {
  button.addEventListener("click", () => openApp(button.dataset.openApp));
});
document.querySelectorAll("[data-toggle-card]").forEach((button) => {
  button.addEventListener("click", () => toggleCard(button.dataset.toggleCard));
});

saveDataButton.addEventListener("click", handleSaveData);
saveDataHomeButton.addEventListener("click", handleSaveData);
backToHomeButton.addEventListener("click", closeAppView);
runMigrationButton.addEventListener("click", runMigration);
blackTrayMultiplierInput.addEventListener("change", handleBlackTrayMultiplierInput);
customerForm.addEventListener("submit", handleCustomerSubmit);
addChefButton.addEventListener("click", () => addChefRow());
resetCustomerFormButton.addEventListener("click", resetCustomerForm);
skuForm.addEventListener("submit", handleSkuSubmit);
resetSkuFormButton.addEventListener("click", resetSkuForm);
orderCustomerSelect.addEventListener("change", handleOrderCustomerSelection);
addOrderItemButton.addEventListener("click", () => addOrderItemRow());
orderForm.addEventListener("submit", handleOrderSubmit);
resetOrderFormButton.addEventListener("click", resetOrderForm);
downloadInvoiceButton.addEventListener("click", handleDownloadInvoice);

renderAll();
initRemoteState();

function createDefaultState() {
  return {
    blackTrayMultiplier: DEFAULT_BLACK_TRAY_MULTIPLIER,
    crops: [],
    seeding: createEmptySeedingData([]),
    customers: [],
    skus: [],
    orders: [],
  };
}

function createEmptySeedingData(crops) {
  const data = {};
  crops.forEach((crop) => {
    data[crop.id] = {};
    trayTypes.forEach((tray) => {
      data[crop.id][tray.id] = {};
      seedingDates.forEach((date) => {
        data[crop.id][tray.id][toDateKey(date)] = 0;
      });
    });
  });
  return data;
}

function renderAll() {
  appVersionElement.textContent = `Version ${APP_VERSION}`;
  renderYield();
  renderCustomers();
  renderSkus();
  renderOrdering();
  renderAnalytics();
  saveDataButton.textContent = "Save";
  saveDataHomeButton.textContent = "Save Data to Firebase";
}

function renderYield() {
  blackTrayMultiplierInput.value = formatNumber(state.blackTrayMultiplier);
  planningWindowLabelElement.textContent = `${formatShortDate(seedingDates[0])} to ${formatShortDate(seedingDates[seedingDates.length - 1])}`;
  windowTotalElement.textContent = formatNumber(getTotalSeededTraysInWindow());
  monthTotalElement.textContent = formatNumber(getTotalBoxesInWindow());
  renderConfigTable();
  renderSeedingTable();
  renderBoxesTable();
}

function renderConfigTable() {
  configTable.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-column">Crop</th>
        <th>Name</th>
        <th>Green Seed (g)</th>
        <th>Black Seed (g)</th>
        <th>Harvest Days</th>
        <th>Green Yield (boxes)</th>
        <th>Black Yield (boxes)</th>
      </tr>
    </thead>
    <tbody>
      ${state.crops.map((crop) => `
        <tr>
          <td class="sticky-column">${escapeHtml(crop.name)}</td>
          <td><input class="data-input data-input--small config-input" type="text" value="${escapeAttribute(crop.name)}" data-crop-id="${crop.id}" data-field="name"></td>
          <td><input class="data-input config-input" type="number" min="0" step="0.1" value="${formatNumber(crop.greenSeedGrams)}" data-crop-id="${crop.id}" data-field="greenSeedGrams"></td>
          <td>${formatNumber(crop.greenSeedGrams * state.blackTrayMultiplier)}</td>
          <td><input class="data-input config-input" type="number" min="1" step="1" value="${crop.harvestDays}" data-crop-id="${crop.id}" data-field="harvestDays"></td>
          <td><input class="data-input config-input" type="number" min="0" step="0.05" value="${formatNumber(crop.greenTrayYieldBoxes)}" data-crop-id="${crop.id}" data-field="greenTrayYieldBoxes"></td>
          <td>${formatNumber(crop.greenTrayYieldBoxes * state.blackTrayMultiplier)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  configTable.querySelectorAll(".config-input").forEach((input) => input.addEventListener("change", handleConfigInput));
}

function renderSeedingTable() {
  const bodyRows = [];
  state.crops.forEach((crop) => {
    bodyRows.push(`
      <tr class="section-row">
        <td class="sticky-column">${escapeHtml(crop.name)}</td>
        <td colspan="${seedingDates.length}">Harvest ${crop.harvestDays} days after seeding | Green yield ${formatNumber(crop.greenTrayYieldBoxes)} | Black yield ${formatNumber(getTrayYieldBoxes(crop, "black"))}</td>
      </tr>
    `);
    trayTypes.forEach((tray) => {
      bodyRows.push(`
        <tr>
          <td class="sticky-column">
            <div class="tray-label">
              <span>${escapeHtml(crop.name)} ${tray.shortLabel}</span>
              <small>${tray.name}</small>
            </div>
          </td>
          ${seedingDates.map((date) => `
            <td>
              <input class="data-input seeding-input" type="number" min="0" step="1" value="${state.seeding[crop.id][tray.id][toDateKey(date)]}" data-crop-id="${crop.id}" data-tray-id="${tray.id}" data-date="${toDateKey(date)}">
            </td>
          `).join("")}
        </tr>
      `);
    });
  });

  seedingTable.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-column">Seeding</th>
        ${seedingDates.map((date) => renderDateHeader(date)).join("")}
      </tr>
    </thead>
    <tbody>
      ${bodyRows.join("")}
      <tr class="totals-row">
        <td class="sticky-column">Total Trays</td>
        ${seedingDates.map((date) => `<td>${formatNumber(getTotalSeededTraysForDate(date))}</td>`).join("")}
      </tr>
    </tbody>
  `;
  seedingTable.querySelectorAll(".seeding-input").forEach((input) => input.addEventListener("input", handleSeedingInput));
}

function renderBoxesTable() {
  const harvestDates = getHarvestDatesForWindow();
  boxesTable.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-column">Boxes</th>
        ${harvestDates.map((date) => `<th>${formatDayMonth(date)}<br><span class="rule-chip">${formatWeekday(date)}</span></th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${state.crops.map((crop) => `
        <tr>
          <td class="sticky-column">${escapeHtml(crop.name)}</td>
          ${harvestDates.map((date) => `<td>${formatNumber(getCropBoxesForHarvestDate(crop, date))}</td>`).join("")}
        </tr>
      `).join("")}
      <tr class="totals-row">
        <td class="sticky-column">Total Boxes</td>
        ${harvestDates.map((date) => `<td>${formatNumber(getTotalBoxesForHarvestDate(date))}</td>`).join("")}
      </tr>
    </tbody>
  `;
}

function renderCustomers() {
  customerFormTitleElement.textContent = editingCustomerId ? "Edit Customer" : "New Customer";
  customersListElement.innerHTML = state.customers.length
    ? state.customers.map((customer) => `
      <article class="list-card">
        <div class="list-card__header">
          <div>
            <h4>${escapeHtml(customer.customerName)}</h4>
            <div class="list-card__meta">
              <span>Code: ${escapeHtml(customer.customerCode || "-")}</span>
              <span>${escapeHtml(customer.billing.organization || "No organization")}</span>
            </div>
          </div>
          <div class="list-card__actions">
            <button class="list-action" type="button" data-edit-customer="${customer.id}">Edit</button>
            <button class="list-action list-action--danger" type="button" data-delete-customer="${customer.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join("")
    : `<div class="empty-state">No customers yet.</div>`;

  customersListElement.querySelectorAll("[data-edit-customer]").forEach((button) => {
    button.addEventListener("click", () => startEditingCustomer(button.dataset.editCustomer));
  });
  customersListElement.querySelectorAll("[data-delete-customer]").forEach((button) => {
    button.addEventListener("click", () => deleteCustomer(button.dataset.deleteCustomer));
  });
}

function renderSkus() {
  skuFormTitleElement.textContent = editingSkuId ? "Edit SKU" : "New SKU";
  skuListElement.innerHTML = state.skus.map((sku) => `
    <article class="list-card">
      <div class="list-card__header">
        <div>
          <h4>${escapeHtml(sku.name)}</h4>
          <div class="list-card__meta">
            <span>Price: ${formatCurrency(sku.price)}</span>
            <span>HSN: ${escapeHtml(sku.hsn)}</span>
          </div>
        </div>
        <div class="list-card__actions">
          <button class="list-action" type="button" data-edit-sku="${sku.id}">Edit</button>
          <button class="list-action list-action--danger" type="button" data-delete-sku="${sku.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join("");

  skuListElement.querySelectorAll("[data-edit-sku]").forEach((button) => button.addEventListener("click", () => startEditingSku(button.dataset.editSku)));
  skuListElement.querySelectorAll("[data-delete-sku]").forEach((button) => button.addEventListener("click", () => deleteSku(button.dataset.deleteSku)));
}

function renderOrdering() {
  renderOrderCustomerOptions();
  refreshOrderItemSkuOptions();
  renderOrdersList();
  ensureOrderDefaults();
  if (!orderItemsElement.children.length) {
    addOrderItemRow();
  }
  if (!currentInvoiceOrderId) {
    invoicePreviewElement.className = "invoice-preview empty-state";
    invoicePreviewElement.textContent = "Save an order, then choose Generate Invoice from the saved orders list.";
  }
}

function renderOrderCustomerOptions() {
  orderCustomerSelect.innerHTML = `<option value="">New customer from invoice</option>${state.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.customerName)}</option>`).join("")}`;
}

function renderOrdersList() {
  const sortedOrders = getOrdersSortedNewestFirst();
  ordersListElement.innerHTML = sortedOrders.length
    ? sortedOrders.map((order) => `
      <article class="list-card">
        <div class="list-card__header">
          <div>
            <h4>${escapeHtml(order.invoiceNumber)} | ${escapeHtml(order.customerName)}</h4>
            <div class="list-card__meta">
              <span>Date: ${formatInvoiceDate(order.date)}</span>
              <span>Total: ${formatCurrency(order.total)}</span>
            </div>
          </div>
          <div class="list-card__actions">
            <button class="list-action" type="button" data-edit-order="${order.id}">Edit</button>
            <button class="list-action" type="button" data-generate-invoice="${order.id}">Generate Invoice</button>
            <button class="list-action list-action--danger" type="button" data-delete-order="${order.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join("")
    : `<div class="empty-state">No orders saved yet.</div>`;

  ordersListElement.querySelectorAll("[data-edit-order]").forEach((button) => button.addEventListener("click", () => startEditingOrder(button.dataset.editOrder)));
  ordersListElement.querySelectorAll("[data-generate-invoice]").forEach((button) => button.addEventListener("click", () => generateInvoiceFromOrder(button.dataset.generateInvoice)));
  ordersListElement.querySelectorAll("[data-delete-order]").forEach((button) => button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder)));
}

function renderAnalytics() {
  if (!analyticsSales14Element) return;

  const sortedOrders = getOrdersSortedNewestFirst();
  const last14Start = addDays(today, -13);
  const recentOrders = sortedOrders.filter((order) => parseOrderDate(order.date) >= last14Start);
  const currentMonthKey = toMonthKey(today);
  const thisMonthOrders = sortedOrders.filter((order) => toMonthKey(parseOrderDate(order.date)) === currentMonthKey);

  analyticsSales14Element.textContent = formatCurrency(recentOrders.reduce((sum, order) => sum + toPositiveNumber(order.total, 0), 0));
  analyticsSalesMonthElement.textContent = formatCurrency(thisMonthOrders.reduce((sum, order) => sum + toPositiveNumber(order.total, 0), 0));

  renderManhattanChart(
    analyticsDailyChartElement,
    buildSalesBuckets(sortedOrders, (date) => toDateKey(date), 14),
    "No daily sales available yet."
  );
  renderManhattanChart(
    analyticsMonthlyChartElement,
    buildSalesBuckets(sortedOrders, (date) => toMonthKey(date)),
    "No monthly sales available yet."
  );
  renderManhattanChart(
    analyticsYearlyChartElement,
    buildSalesBuckets(sortedOrders, (date) => String(date.getFullYear())),
    "No yearly sales available yet."
  );

  const forecast = buildTwoWeekDemandForecast(sortedOrders);
  analyticsForecastTotalElement.textContent = formatNumber(forecast.totalBoxes);
  renderForecastDays(forecast.byDay);
  renderForecastSkus(forecast.bySku);
}

function openApp(appKey) {
  landingView.classList.add("hidden");
  appView.classList.remove("hidden");
  Object.entries(appPanels).forEach(([key, panel]) => panel.classList.toggle("hidden", key !== appKey));
  activeAppTagElement.textContent = appMeta[appKey].tag;
  activeAppTitleElement.textContent = appMeta[appKey].title;
  activeAppSubtitleElement.textContent = appMeta[appKey].subtitle;
}

function closeAppView() {
  appView.classList.add("hidden");
  landingView.classList.remove("hidden");
}

function toggleCard(cardKey) {
  const card = collapsibleCards[cardKey];
  card.classList.toggle("is-collapsed");
  card.querySelector(".collapse-indicator").textContent = card.classList.contains("is-collapsed") ? "Expand" : "Collapse";
}

function handleBlackTrayMultiplierInput(event) {
  state.blackTrayMultiplier = toPositiveNumber(event.target.value, DEFAULT_BLACK_TRAY_MULTIPLIER);
  renderYield();
  markDirty();
}

function handleConfigInput(event) {
  const crop = state.crops.find((item) => item.id === event.target.dataset.cropId);
  if (!crop) return;
  const field = event.target.dataset.field;
  if (field === "name") crop.name = event.target.value.trim() || crop.name;
  if (field === "greenSeedGrams") crop.greenSeedGrams = toPositiveNumber(event.target.value, crop.greenSeedGrams);
  if (field === "harvestDays") crop.harvestDays = toPositiveInteger(event.target.value, crop.harvestDays);
  if (field === "greenTrayYieldBoxes") crop.greenTrayYieldBoxes = toPositiveNumber(event.target.value, crop.greenTrayYieldBoxes);
  renderYield();
  markDirty();
}

function handleSeedingInput(event) {
  state.seeding[event.target.dataset.cropId][event.target.dataset.trayId][event.target.dataset.date] = toPositiveInteger(event.target.value, 0);
  renderYield();
  markDirty();
}

function handleCustomerSubmit(event) {
  event.preventDefault();
  const payload = {
    id: editingCustomerId || createId("customer"),
    customerName: document.getElementById("customer-name").value.trim(),
    customerCode: document.getElementById("customer-code").value.trim(),
    mapLink: document.getElementById("customer-map-link").value.trim(),
    contactName: document.getElementById("customer-contact-name").value.trim(),
    contactNumber: document.getElementById("customer-contact-number").value.trim(),
    billing: {
      organization: document.getElementById("billing-organization").value.trim(),
      address: document.getElementById("billing-address").value.trim(),
      gst: document.getElementById("billing-gst").value.trim(),
      phone: document.getElementById("billing-phone").value.trim(),
      paymentCycle: document.getElementById("billing-payment-cycle").value.trim(),
    },
    chefs: collectChefRows(),
  };
  upsertCustomer(payload);
  editingCustomerId = null;
  resetCustomerFormFields();
  renderCustomers();
  renderOrdering();
  markDirty();
}

function addChefRow(chef = { name: "", phone: "", notes: "" }) {
  const row = document.createElement("div");
  row.className = "chef-row";
  row.innerHTML = `
    <label class="form-field"><span>Chef Name</span><input type="text" data-chef-field="name" value="${escapeAttribute(chef.name)}"></label>
    <label class="form-field"><span>Chef Number</span><input type="text" data-chef-field="phone" value="${escapeAttribute(chef.phone)}"></label>
    <label class="form-field"><span>Notes</span><input type="text" data-chef-field="notes" value="${escapeAttribute(chef.notes)}"></label>
    <button class="list-action list-action--danger" type="button">Remove</button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  chefListElement.appendChild(row);
}

function collectChefRows() {
  return Array.from(chefListElement.querySelectorAll(".chef-row")).map((row) => ({
    name: row.querySelector('[data-chef-field="name"]').value.trim(),
    phone: row.querySelector('[data-chef-field="phone"]').value.trim(),
    notes: row.querySelector('[data-chef-field="notes"]').value.trim(),
  })).filter((chef) => chef.name || chef.phone || chef.notes);
}

function startEditingCustomer(customerId) {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer) return;
  editingCustomerId = customerId;
  document.getElementById("customer-name").value = customer.customerName;
  document.getElementById("customer-code").value = customer.customerCode || "";
  document.getElementById("customer-map-link").value = customer.mapLink;
  document.getElementById("customer-contact-name").value = customer.contactName;
  document.getElementById("customer-contact-number").value = customer.contactNumber;
  document.getElementById("billing-organization").value = customer.billing.organization;
  document.getElementById("billing-address").value = customer.billing.address;
  document.getElementById("billing-gst").value = customer.billing.gst;
  document.getElementById("billing-phone").value = customer.billing.phone;
  document.getElementById("billing-payment-cycle").value = customer.billing.paymentCycle;
  chefListElement.innerHTML = "";
  customer.chefs.forEach((chef) => addChefRow(chef));
}

function deleteCustomer(customerId) {
  state.customers = state.customers.filter((customer) => customer.id !== customerId);
  renderCustomers();
  renderOrdering();
  markDirty();
}

function resetCustomerForm() {
  editingCustomerId = null;
  resetCustomerFormFields();
}

function resetCustomerFormFields() {
  customerForm.reset();
  chefListElement.innerHTML = "";
}

function handleSkuSubmit(event) {
  event.preventDefault();
  const payload = {
    id: editingSkuId || createId("sku"),
    name: document.getElementById("sku-name").value.trim(),
    price: toPositiveNumber(document.getElementById("sku-price").value, 0),
    hsn: document.getElementById("sku-hsn").value.trim(),
  };
  const index = state.skus.findIndex((sku) => sku.id === payload.id);
  if (index >= 0) state.skus[index] = payload;
  else state.skus.push(payload);
  editingSkuId = null;
  skuForm.reset();
  renderSkus();
  renderOrdering();
  markDirty();
}

function startEditingSku(skuId) {
  const sku = state.skus.find((item) => item.id === skuId);
  if (!sku) return;
  editingSkuId = sku.id;
  document.getElementById("sku-name").value = sku.name;
  document.getElementById("sku-price").value = sku.price;
  document.getElementById("sku-hsn").value = sku.hsn;
}

function deleteSku(skuId) {
  state.skus = state.skus.filter((sku) => sku.id !== skuId);
  renderSkus();
  renderOrdering();
  markDirty();
}

function resetSkuForm() {
  editingSkuId = null;
  skuForm.reset();
}

function handleOrderCustomerSelection() {
  const customer = state.customers.find((item) => item.id === orderCustomerSelect.value);
  if (!customer) {
    orderCustomerNameInput.value = "";
    orderCustomerCodeInput.value = "";
    orderBillingOrganizationInput.value = "";
    orderBillingAddressInput.value = "";
    orderBillingGstInput.value = "";
    orderBillingPhoneInput.value = "";
    orderBillingPaymentCycleInput.value = "";
    return;
  }
  orderCustomerNameInput.value = customer.customerName;
  orderCustomerCodeInput.value = customer.customerCode || "";
  orderBillingOrganizationInput.value = customer.billing.organization || "";
  orderBillingAddressInput.value = customer.billing.address || "";
  orderBillingGstInput.value = customer.billing.gst || "";
  orderBillingPhoneInput.value = customer.billing.phone || "";
  orderBillingPaymentCycleInput.value = customer.billing.paymentCycle || "";
}

function addOrderItemRow(item = { skuId: "", quantity: 1 }) {
  const row = document.createElement("div");
  row.className = "order-item";
  row.innerHTML = `
    <label class="form-field">
      <span>Product</span>
      <select data-order-field="skuId">${renderSkuOptions(item.skuId)}</select>
    </label>
    <label class="form-field">
      <span>Quantity</span>
      <input data-order-field="quantity" type="number" min="1" step="1" value="${item.quantity}">
    </label>
    <button class="list-action list-action--danger" type="button">Remove</button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  orderItemsElement.appendChild(row);
}

function refreshOrderItemSkuOptions() {
  orderItemsElement.querySelectorAll('[data-order-field="skuId"]').forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = renderSkuOptions(currentValue);
    select.value = currentValue;
  });
}

function renderSkuOptions(selectedId) {
  return `<option value="">Select SKU</option>${state.skus.map((sku) => `<option value="${sku.id}" ${sku.id === selectedId ? "selected" : ""}>${escapeHtml(sku.name)}</option>`).join("")}`;
}

function handleOrderSubmit(event) {
  event.preventDefault();
  const items = Array.from(orderItemsElement.querySelectorAll(".order-item")).map((row) => {
    const sku = state.skus.find((item) => item.id === row.querySelector('[data-order-field="skuId"]').value);
    const quantity = toPositiveInteger(row.querySelector('[data-order-field="quantity"]').value, 0);
    if (!sku || quantity <= 0) return null;
    return {
      skuId: sku.id,
      description: sku.name,
      hsn: sku.hsn,
      quantity,
      price: sku.price,
      amount: sku.price * quantity,
    };
  }).filter(Boolean);
  if (!items.length) {
    setSyncStatus("Add at least one valid product");
    return;
  }

  const customerPayload = {
    id: orderCustomerSelect.value || createId("customer"),
    customerName: orderCustomerNameInput.value.trim(),
    customerCode: orderCustomerCodeInput.value.trim(),
    mapLink: "",
    contactName: "",
    contactNumber: "",
    billing: {
      organization: orderBillingOrganizationInput.value.trim(),
      address: orderBillingAddressInput.value.trim(),
      gst: orderBillingGstInput.value.trim(),
      phone: orderBillingPhoneInput.value.trim(),
      paymentCycle: orderBillingPaymentCycleInput.value.trim(),
    },
    chefs: [],
  };
  upsertCustomer(customerPayload);

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discountPercent = toPositiveNumber(orderDiscountPercentInput.value, 0);
  const discountAmount = subtotal * discountPercent / 100;
  const total = subtotal - discountAmount;
  const orderPayload = {
    id: editingOrderId || createId("order"),
    customerId: customerPayload.id,
    customerName: customerPayload.customerName,
    customerCode: customerPayload.customerCode,
    billing: { ...customerPayload.billing },
    date: orderDateInput.value,
    invoiceNumber: orderInvoiceNumberInput.value.trim(),
    dueDate: orderDueDateInput.value,
    discountPercent,
    subtotal,
    discountAmount,
    total,
    items,
  };

  const index = state.orders.findIndex((order) => order.id === orderPayload.id);
  if (index >= 0) state.orders[index] = orderPayload;
  else state.orders.push(orderPayload);

  editingOrderId = null;
  resetOrderForm();
  renderCustomers();
  renderOrdering();
  markDirty();
  setSyncStatus("Order draft saved");
}

function startEditingOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  editingOrderId = order.id;
  orderCustomerSelect.value = order.customerId || "";
  orderCustomerNameInput.value = order.customerName;
  orderCustomerCodeInput.value = order.customerCode || "";
  orderDateInput.value = order.date;
  orderInvoiceNumberInput.value = order.invoiceNumber;
  orderDueDateInput.value = order.dueDate;
  orderBillingOrganizationInput.value = order.billing.organization;
  orderBillingAddressInput.value = order.billing.address;
  orderBillingGstInput.value = order.billing.gst;
  orderBillingPhoneInput.value = order.billing.phone;
  orderBillingPaymentCycleInput.value = order.billing.paymentCycle;
  orderDiscountPercentInput.value = order.discountPercent;
  orderItemsElement.innerHTML = "";
  order.items.forEach((item) => addOrderItemRow(item));
}

function deleteOrder(orderId) {
  state.orders = state.orders.filter((order) => order.id !== orderId);
  if (currentInvoiceOrderId === orderId) {
    currentInvoiceOrderId = null;
  }
  renderOrdering();
  markDirty();
}

function resetOrderForm() {
  editingOrderId = null;
  orderForm.reset();
  orderCustomerSelect.value = "";
  orderItemsElement.innerHTML = "";
  addOrderItemRow();
  ensureOrderDefaults();
}

function ensureOrderDefaults() {
  if (!orderDateInput.value) orderDateInput.value = toInputDate(today);
  if (!orderDueDateInput.value) orderDueDateInput.value = toInputDate(addDays(today, 30));
  if (!orderInvoiceNumberInput.value) orderInvoiceNumberInput.value = getNextInvoiceNumber();
  if (!orderDiscountPercentInput.value) orderDiscountPercentInput.value = "0";
}

function generateInvoiceFromOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  currentInvoiceOrderId = orderId;
  invoicePreviewElement.className = "invoice-preview";
  invoicePreviewElement.innerHTML = `<div class="invoice-sheet"><div class="invoice-top"><div class="invoice-brand"><img src="${companyDetails.logoPath}" alt="Leaf Over Logic logo" class="invoice-logo"><h3>${escapeHtml(companyDetails.name)}</h3>${companyDetails.address.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}<div>Phone: ${escapeHtml(companyDetails.phone)}</div><div>Website: ${escapeHtml(companyDetails.website)}</div></div><div class="invoice-meta"><h3>INVOICE</h3><table><tr><td>DATE</td><td>${formatInvoiceDate(order.date)}</td></tr><tr><td>INVOICE #</td><td>${escapeHtml(order.invoiceNumber)}</td></tr><tr><td>CUSTOMER ID</td><td>${escapeHtml(order.customerCode)}</td></tr><tr><td>DUE DATE</td><td>${formatInvoiceDate(order.dueDate)}</td></tr></table></div></div><div class="invoice-grid"><div class="invoice-block"><h4>BILL TO</h4><div class="invoice-block__body"><div>${escapeHtml(order.billing.organization || order.customerName)}</div>${order.billing.address.split("\n").filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join("")}<div>GSTIN/UIN: ${escapeHtml(order.billing.gst || "-")}</div><div>Ph: ${escapeHtml(order.billing.phone || "-")}</div></div></div><div class="invoice-block"><h4>Account Details</h4><div class="invoice-block__body"><div>Beneficiary Name: ${escapeHtml(companyDetails.account.beneficiary)}</div><div>Account Number: ${escapeHtml(companyDetails.account.number)}</div><div>IFSC Code: ${escapeHtml(companyDetails.account.ifsc)}</div><div>Branch: ${escapeHtml(companyDetails.account.branch)}</div><div>Bank: ${escapeHtml(companyDetails.account.bank)}</div></div></div></div><table class="invoice-table"><thead><tr><th>No.</th><th>Product</th><th>Description</th><th>HSN</th><th>QTY</th><th>Price</th><th>AMOUNT</th></tr></thead><tbody>${order.items.map((item, index) => `<tr><td>${index + 1}</td><td>Rozana Greens Microgreens</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.hsn)}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.amount)}</td></tr>`).join("")}</tbody></table><div class="invoice-grid"><div class="invoice-terms"><h4>Terms & Conditions</h4><div class="invoice-terms__body"><div>1. Total payment due in ${escapeHtml(order.billing.paymentCycle || "30 days")}</div><div>2. Please include the invoice number on your check</div></div></div><div class="invoice-total"><div class="invoice-total__row"><span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong></div><div class="invoice-total__row"><span>Discount</span><strong>${formatCurrency(order.discountAmount)}</strong></div><div class="invoice-total__row"><span>GST amount</span><strong>-</strong></div><div class="invoice-total__row"><span>Other</span><strong>-</strong></div><div class="invoice-total__row invoice-total__row--strong"><span>TOTAL</span><strong>${formatCurrency(order.total)}</strong></div><div style="margin-top:12px;">Make all checks payable to ${escapeHtml(companyDetails.account.beneficiary)}</div></div></div><div class="invoice-footnote">If you have any questions about this invoice, please contact<br>${escapeHtml(companyDetails.contactFooter)}<br><strong>Thank You For Your Business!</strong></div></div>`;
}

function handleDownloadInvoice() {
  if (!currentInvoiceOrderId) {
    setSyncStatus("Generate invoice first");
    return;
  }
  const printWindow = window.open("", "_blank", "width=1200,height=900");
  printWindow.document.write(`<html><head><title>Invoice</title><link rel="stylesheet" href="styles.css"></head><body>${invoicePreviewElement.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function upsertCustomer(payload) {
  const index = state.customers.findIndex((customer) => customer.id === payload.id);
  if (index >= 0) state.customers[index] = payload;
  else state.customers.push(payload);
}

async function runMigration() {
  try {
    const payload = await loadMigrationPayload();
    const migratedCustomers = cloneCustomers(payload.customers || []);
    state.customers = mergeCustomersByCode(state.customers, migratedCustomers);

    const customerByCode = new Map(state.customers.map((customer) => [customer.customerCode, customer]));
    const migratedOrders = (payload.orders || []).map((order) => hydrateMigratedOrder(order, customerByCode));
    state.orders = mergeOrdersByInvoice(state.orders, migratedOrders);

    renderAll();
    markDirty();
    setSyncStatus(`Migration data loaded (${migratedOrders.length} orders). Click Save.`);
  } catch (error) {
    console.error("Migration load failed:", error);
    setSyncStatus(`Migration failed: ${String(error?.message || "Unknown error").slice(0, 80)}`);
  }
}

async function handleSaveData() {
  if (!isDirty) {
    setSyncStatus("No new changes");
    return;
  }
  if (!cloudSyncEnabled) {
    setSyncStatus("Firebase unavailable");
    return;
  }
  setSyncStatus("Saving...");
  await saveStateToFirebase();
}

async function initRemoteState() {
  if (!firebaseSettings.enabled || !hasFirebaseConfig(firebaseSettings.config)) {
    setSyncStatus("Firebase not configured");
    return;
  }
  try {
    setSyncStatus("Connecting to Firebase...");
    cloudSyncEnabled = true;
    const response = await fetch(getDatabaseRestUrl(), {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const remote = await response.json();
    if (remote?.data) {
      applySerializedState(remote.data);
      renderAll();
      setSyncStatus("Firebase synced");
    } else {
      setSyncStatus("Firebase ready");
    }
  } catch (error) {
    cloudSyncEnabled = false;
    console.error("Firebase init failed:", error);
    setSyncStatus(getFirebaseErrorMessage(error, "Init failed"));
  }
}

async function saveStateToFirebase() {
  try {
    const response = await fetch(getDatabaseRestUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updatedAt: new Date().toISOString(),
        data: serializeState(),
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    isDirty = false;
    setSyncStatus("Saved to Firebase");
  } catch (error) {
    console.error("Firebase save failed:", error);
    setSyncStatus(getFirebaseErrorMessage(error, "Save failed"));
  }
}

function serializeState() {
  return {
    blackTrayMultiplier: state.blackTrayMultiplier,
    crops: state.crops,
    seeding: state.seeding,
    customers: state.customers,
    skus: state.skus,
    orders: state.orders,
  };
}

function applySerializedState(rawState) {
  state.blackTrayMultiplier = toPositiveNumber(rawState.blackTrayMultiplier, DEFAULT_BLACK_TRAY_MULTIPLIER);
  state.crops = Array.isArray(rawState.crops) ? rawState.crops : [];
  state.seeding = createSeedState(state.crops, rawState.seeding);
  state.customers = Array.isArray(rawState.customers) ? rawState.customers : [];
  state.skus = Array.isArray(rawState.skus) ? rawState.skus : [];
  state.orders = Array.isArray(rawState.orders) ? rawState.orders : [];
}

function createSeedState(crops, savedSeeding) {
  const base = createEmptySeedingData(crops);
  if (!savedSeeding || typeof savedSeeding !== "object") return base;
  crops.forEach((crop) => {
    trayTypes.forEach((tray) => {
      seedingDates.forEach((date) => {
        base[crop.id][tray.id][toDateKey(date)] = toPositiveInteger(savedSeeding?.[crop.id]?.[tray.id]?.[toDateKey(date)], 0);
      });
    });
  });
  return base;
}

function getDatabaseRestUrl() {
  const base = String(firebaseSettings.config.databaseURL || "").replace(/\/+$/, "");
  const path = String(firebaseSettings.statePath || "").replace(/^\/+|\/+$/g, "");
  return `${base}/${path}.json`;
}

function hasFirebaseConfig(config) {
  return Boolean(config && config.databaseURL && config.projectId);
}

function getFirebaseErrorMessage(error, fallback) {
  const message = String(error?.message || "");
  if (message.includes("HTTP 401") || message.includes("HTTP 403")) return "Firebase rules blocked access";
  if (message.includes("HTTP 404")) return "Firebase database URL issue";
  if (message.includes("Failed to fetch")) return "Firebase network error";
  return message ? `${fallback}: ${message.slice(0, 80)}` : fallback;
}

function markDirty() {
  isDirty = true;
  setSyncStatus("Unsaved changes");
}

function getOrdersSortedNewestFirst() {
  return [...state.orders].sort((left, right) => {
    const byDate = parseOrderDate(right.date) - parseOrderDate(left.date);
    if (byDate !== 0) return byDate;
    return extractInvoiceSequence(right.invoiceNumber) - extractInvoiceSequence(left.invoiceNumber);
  });
}

function buildSalesBuckets(orders, keyGetter, limit = null) {
  const totals = new Map();
  orders.forEach((order) => {
    const date = parseOrderDate(order.date);
    const key = keyGetter(date);
    totals.set(key, (totals.get(key) || 0) + toPositiveNumber(order.total, 0));
  });

  let entries = Array.from(totals.entries()).sort((left, right) => left[0].localeCompare(right[0]));
  if (limit) entries = entries.slice(-limit);
  return entries.map(([label, value]) => ({ label, value }));
}

function renderManhattanChart(element, entries, emptyMessage) {
  if (!element) return;
  if (!entries.length) {
    element.innerHTML = `<div class="manhattan-chart__empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  const maxValue = Math.max(...entries.map((entry) => entry.value), 1);
  element.innerHTML = entries.map((entry) => {
    const height = Math.max(8, Math.round((entry.value / maxValue) * 180));
    return `
      <div class="manhattan-bar" title="${escapeAttribute(entry.label)}: ${formatCurrency(entry.value)}">
        <span class="manhattan-bar__value">${escapeHtml(formatCompactCurrency(entry.value))}</span>
        <div class="manhattan-bar__tower" style="height:${height}px"></div>
        <span class="manhattan-bar__label">${escapeHtml(entry.label)}</span>
      </div>
    `;
  }).join("");
}

function buildTwoWeekDemandForecast(orders) {
  const last14Start = addDays(today, -13);
  const recentOrders = orders.filter((order) => parseOrderDate(order.date) >= last14Start);
  const byDay = new Map();
  const bySku = new Map();

  recentOrders.forEach((order) => {
    const futureDate = addDays(parseOrderDate(order.date), 14);
    const futureKey = toDateKey(futureDate);
    const dayEntry = byDay.get(futureKey) || { date: futureKey, totalBoxes: 0, skuMap: new Map() };

    (order.items || []).forEach((item) => {
      const quantity = toPositiveInteger(item.quantity, 0);
      const skuName = item.description || "Unknown SKU";
      dayEntry.totalBoxes += quantity;
      dayEntry.skuMap.set(skuName, (dayEntry.skuMap.get(skuName) || 0) + quantity);
      bySku.set(skuName, (bySku.get(skuName) || 0) + quantity);
    });

    byDay.set(futureKey, dayEntry);
  });

  return {
    totalBoxes: Array.from(byDay.values()).reduce((sum, row) => sum + row.totalBoxes, 0),
    byDay: Array.from(byDay.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((row) => ({
        date: row.date,
        totalBoxes: row.totalBoxes,
        skuBreakdown: Array.from(row.skuMap.entries())
          .sort((left, right) => right[1] - left[1])
          .map(([skuName, quantity]) => `${skuName} (${quantity})`)
          .join(", "),
      })),
    bySku: Array.from(bySku.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([skuName, quantity]) => ({ skuName, quantity })),
  };
}

function renderForecastDays(rows) {
  if (!analyticsForecastDaysElement) return;
  analyticsForecastDaysElement.innerHTML = rows.length
    ? rows.map((row) => `
      <div class="forecast-row">
        <strong>${escapeHtml(formatInvoiceDate(row.date))}</strong>
        <span>${escapeHtml(`${row.totalBoxes} boxes`)}<br>${escapeHtml(row.skuBreakdown || "-")}</span>
      </div>
    `).join("")
    : `<div class="forecast-list__empty">No recent orders available to project the next two weeks.</div>`;
}

function renderForecastSkus(rows) {
  if (!analyticsForecastSkusElement) return;
  analyticsForecastSkusElement.innerHTML = rows.length
    ? rows.map((row) => `
      <div class="forecast-row">
        <strong>${escapeHtml(row.skuName)}</strong>
        <span>${escapeHtml(`${row.quantity} boxes expected`)}</span>
      </div>
    `).join("")
    : `<div class="forecast-list__empty">No SKU-level demand forecast available yet.</div>`;
}

async function loadMigrationPayload() {
  const payload = {
    customers: cloneCustomers(migrationData.customers || []),
    orders: Array.isArray(migrationData.orders) ? migrationData.orders.map((order) => ({ ...order })) : [],
  };
  if (!payload.orders.length && migrationData.ordersPath) {
    const response = await fetch(migrationData.ordersPath, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Orders seed HTTP ${response.status}`);
    }
    const remotePayload = await response.json();
    if (!payload.customers.length && Array.isArray(remotePayload.customers)) {
      payload.customers = cloneCustomers(remotePayload.customers);
    }
    if (Array.isArray(remotePayload.orders)) {
      payload.orders = remotePayload.orders.map((order) => ({ ...order }));
    }
  }
  return payload;
}

function cloneCustomers(customers) {
  return customers.map((customer) => ({
    ...customer,
    billing: { ...customer.billing },
    chefs: Array.isArray(customer.chefs) ? customer.chefs.map((chef) => ({ ...chef })) : [],
  }));
}

function mergeCustomersByCode(existingCustomers, incomingCustomers) {
  const merged = new Map();
  existingCustomers.forEach((customer) => {
    const key = customer.customerCode || customer.id;
    if (key) merged.set(key, {
      ...customer,
      billing: { ...customer.billing },
      chefs: Array.isArray(customer.chefs) ? customer.chefs.map((chef) => ({ ...chef })) : [],
    });
  });
  incomingCustomers.forEach((customer) => {
    const key = customer.customerCode || customer.id;
    if (key) merged.set(key, {
      ...customer,
      billing: { ...customer.billing },
      chefs: Array.isArray(customer.chefs) ? customer.chefs.map((chef) => ({ ...chef })) : [],
    });
  });
  return Array.from(merged.values());
}

function mergeOrdersByInvoice(existingOrders, incomingOrders) {
  const merged = new Map();
  existingOrders.forEach((order) => {
    const key = order.invoiceNumber || order.id;
    if (key) merged.set(key, order);
  });
  incomingOrders.forEach((order) => {
    const key = order.invoiceNumber || order.id;
    if (key) merged.set(key, order);
  });
  return Array.from(merged.values()).sort((left, right) => {
    const leftNumber = extractInvoiceSequence(left.invoiceNumber);
    const rightNumber = extractInvoiceSequence(right.invoiceNumber);
    return leftNumber - rightNumber;
  });
}

function hydrateMigratedOrder(order, customerByCode) {
  const customer = customerByCode.get(order.customerCode) || null;
  const billing = customer?.billing ? { ...customer.billing } : { ...(order.billing || {}) };
  const items = Array.isArray(order.items) ? order.items.map((item) => hydrateMigratedItem(item)) : [];
  const subtotal = toPositiveNumber(order.subtotal, items.reduce((sum, item) => sum + item.amount, 0));
  const discountAmount = toPositiveNumber(order.discountAmount, 0);
  const total = toPositiveNumber(order.total, Math.max(0, subtotal - discountAmount));

  return {
    id: order.id || createId("order"),
    customerId: customer?.id || order.customerId || createId("customer"),
    customerName: customer?.customerName || order.customerName || "",
    customerCode: customer?.customerCode || order.customerCode || "",
    billing,
    date: order.date || "",
    invoiceNumber: order.invoiceNumber || "",
    dueDate: order.dueDate || "",
    discountPercent: toPositiveNumber(order.discountPercent, subtotal ? (discountAmount / subtotal) * 100 : 0),
    subtotal,
    discountAmount,
    total,
    items,
  };
}

function hydrateMigratedItem(item) {
  const matchedSku = findSkuByName(item.skuName || item.description || "");
  const quantity = toPositiveInteger(item.quantity, 0);
  const price = toPositiveNumber(item.price, matchedSku?.price || 0);
  return {
    skuId: matchedSku?.id || item.skuId || "",
    description: item.description || matchedSku?.name || "",
    hsn: item.hsn || matchedSku?.hsn || "",
    quantity,
    price,
    amount: toPositiveNumber(item.amount, price * quantity),
  };
}

function findSkuByName(name) {
  const target = normalizeSkuName(name);
  return state.skus.find((sku) => normalizeSkuName(sku.name) === target) || null;
}

function normalizeSkuName(name) {
  const lowered = String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return migrationSkuAliases[lowered] || lowered;
}

function getNextInvoiceNumber() {
  const highest = state.orders.reduce((max, order) => Math.max(max, extractInvoiceSequence(order.invoiceNumber)), 0);
  return String(highest + 1).padStart(4, "0");
}

function extractInvoiceSequence(invoiceNumber) {
  const match = String(invoiceNumber || "").match(/(\d+)(?!.*\d)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseOrderDate(value) {
  const parsed = startOfDay(new Date(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCompactCurrency(value) {
  const amount = toPositiveNumber(value, 0);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${Math.round(amount)}`;
}

function getTotalSeededTraysInWindow() {
  return state.crops.reduce((total, crop) => total + trayTypes.reduce((trayTotal, tray) => trayTotal + seedingDates.reduce((dateTotal, date) => dateTotal + state.seeding[crop.id][tray.id][toDateKey(date)], 0), 0), 0);
}

function getTotalSeededTraysForDate(date) {
  const key = toDateKey(date);
  return state.crops.reduce((total, crop) => total + trayTypes.reduce((trayTotal, tray) => trayTotal + state.seeding[crop.id][tray.id][key], 0), 0);
}

function getTrayYieldBoxes(crop, trayId) {
  return trayId === "black" ? crop.greenTrayYieldBoxes * state.blackTrayMultiplier : crop.greenTrayYieldBoxes;
}

function getHarvestDatesForWindow() {
  const maxHarvestDays = Math.max(...state.crops.map((crop) => crop.harvestDays));
  const dates = [];
  let cursor = addDays(seedingDates[0], DEFAULT_REFERENCE_HARVEST_DAYS);
  const last = addDays(seedingDates[seedingDates.length - 1], maxHarvestDays);
  while (cursor <= last) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function getCropBoxesForHarvestDate(crop, harvestDate) {
  const key = toDateKey(addDays(harvestDate, -crop.harvestDays));
  return (state.seeding[crop.id].green[key] || 0) * getTrayYieldBoxes(crop, "green") + (state.seeding[crop.id].black[key] || 0) * getTrayYieldBoxes(crop, "black");
}

function getTotalBoxesForHarvestDate(date) {
  return state.crops.reduce((total, crop) => total + getCropBoxesForHarvestDate(crop, date), 0);
}

function getTotalBoxesInWindow() {
  return getHarvestDatesForWindow().reduce((total, date) => total + getTotalBoxesForHarvestDate(date), 0);
}

function renderDateHeader(date) {
  return `<th><div class="date-header"><span class="date-header__seed">${formatDayMonth(date)}</span><span class="date-header__meta">${formatWeekday(date)}</span><span class="date-header__harvest">${formatDayMonth(addDays(date, DEFAULT_REFERENCE_HARVEST_DAYS))}</span></div></th>`;
}

function setSyncStatus(message) {
  syncStatusElement.textContent = message;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPositiveNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function toInputDate(date) {
  return toDateKey(date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date);
}

function formatDayMonth(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatInvoiceDate(dateString) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(dateString));
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
