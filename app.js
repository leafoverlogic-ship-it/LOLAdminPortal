const DEFAULT_REFERENCE_HARVEST_DAYS = 11;
const DEFAULT_BLACK_TRAY_MULTIPLIER = 2.5;
const ORDERS_PAGE_SIZE = 10;
const AUTO_SAVE_DELAY_MS = 700;
const APP_VERSION = "v1.6.2";
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
  gst: "09AAGCL4603B1ZW",
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
let editingTitleId = null;
let editingUserId = null;
let editingOrderId = null;
let currentInvoiceOrderId = null;
let currentOrdersPage = 1;
let expandedOrderId = null;
let activeProjectedBoxTooltipKey = "";
let currentLedgerBillingOrganizationKey = "";
let autoSaveTimerId = null;
let saveInFlight = false;
let pendingImmediateSave = false;
let changeSequence = 0;
const saveFeedbackTimers = new Map();
let activeUserId = "";
let otpFirebaseApp = null;
let otpAuth = null;
let otpRecaptchaVerifier = null;
let otpRecaptchaWidgetId = null;
let otpConfirmationResult = null;
let otpAuthObserverAttached = false;

const landingView = document.getElementById("landing-view");
const appView = document.getElementById("app-view");
const loginView = document.getElementById("login-view");
const loginForm = document.getElementById("login-form");
const loginStatusElement = document.getElementById("login-status");
const appShell = document.getElementById("app-shell");
const appVersionElement = document.getElementById("app-version");
const syncStatusElement = document.getElementById("sync-status");
const currentUserChip = document.getElementById("current-user-chip");
const logoutButton = document.getElementById("logout-button");
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
  users: document.getElementById("users-app"),
  otp: document.getElementById("otp-app"),
  ordering: document.getElementById("ordering-app"),
  analytics: document.getElementById("analytics-app"),
  sales: document.getElementById("sales-app"),
};

const appMeta = {
  yield: { tag: "Yield Availability", title: "Seed planning and projected boxes", subtitle: "Tray planning and crop configuration." },
  customers: { tag: "Customers", title: "Customer management", subtitle: "Capture customer, billing, and chef information." },
  skus: { tag: "SKU", title: "SKU catalog", subtitle: "Maintain pricing and HSN data." },
  users: { tag: "User Management", title: "Users, titles, and reporting lines", subtitle: "Maintain titles and assign them to users." },
  otp: { tag: "Mobile OTP", title: "Phone OTP testing", subtitle: "Send and verify Firebase phone authentication codes." },
  ordering: { tag: "Ordering App", title: "Order entry and invoice generation", subtitle: "Save orders first, then generate invoices." },
  analytics: { tag: "Analytics", title: "Sales and demand analytics", subtitle: "Reports based on saved order history." },
  sales: { tag: "Sales", title: "Sales and receipts", subtitle: "Track MTD, YTD, due amounts, and receipts." },
};

const collapsibleCards = {
  config: document.querySelector('[data-card="config"]'),
  seeding: document.querySelector('[data-card="seeding"]'),
};

const planningWindowLabelElement = document.getElementById("planning-window-label");
const windowTotalElement = document.getElementById("window-total");
const monthTotalElement = document.getElementById("month-total");
const blackTrayMultiplierInput = document.getElementById("black-tray-multiplier");
const addCropButton = document.getElementById("add-crop");
const configTable = document.getElementById("config-table");
const seedingTable = document.getElementById("seeding-table");
const boxesTable = document.getElementById("boxes-table");

const customersListElement = document.getElementById("customers-list");
const customerForm = document.getElementById("customer-form");
const chefListElement = document.getElementById("chef-list");
const addChefButton = document.getElementById("add-chef");
const resetCustomerFormButton = document.getElementById("reset-customer-form");
const customerFormTitleElement = document.getElementById("customer-form-title");
const customerInvoicingTypeInput = document.getElementById("customer-invoicing-type");
const billingPaymentCycleTypeInput = document.getElementById("billing-payment-cycle-type");
const billingPaymentCycleDaysField = document.getElementById("billing-payment-cycle-days-field");
const billingPaymentCycleDaysInput = document.getElementById("billing-payment-cycle-days");
const billingPaymentCycleDayField = document.getElementById("billing-payment-cycle-day-field");
const billingPaymentCycleDayInput = document.getElementById("billing-payment-cycle-day-of-month");

const skuListElement = document.getElementById("sku-list");
const skuForm = document.getElementById("sku-form");
const resetSkuFormButton = document.getElementById("reset-sku-form");
const skuFormTitleElement = document.getElementById("sku-form-title");

const titleListElement = document.getElementById("title-list");
const titleForm = document.getElementById("title-form");
const resetTitleFormButton = document.getElementById("reset-title-form");
const titleFormTitleElement = document.getElementById("title-form-title");
const userListElement = document.getElementById("users-list");
const userForm = document.getElementById("user-form");
const resetUserFormButton = document.getElementById("reset-user-form");
const userFormTitleElement = document.getElementById("user-form-title");
const userTitleSelect = document.getElementById("user-title");
const userReportingManagerSelect = document.getElementById("user-reporting-manager");
const customerSaveFeedbackElement = document.getElementById("customer-save-feedback");
const skuSaveFeedbackElement = document.getElementById("sku-save-feedback");
const titleSaveFeedbackElement = document.getElementById("title-save-feedback");
const userSaveFeedbackElement = document.getElementById("user-save-feedback");
const orderSaveFeedbackElement = document.getElementById("order-save-feedback");
const otpUserSelect = document.getElementById("otp-user-select");
const otpPhoneNumberInput = document.getElementById("otp-phone-number");
const otpModeSelect = document.getElementById("otp-mode-select");
const otpCodeInput = document.getElementById("otp-code");
const sendOtpButton = document.getElementById("send-otp-button");
const verifyOtpButton = document.getElementById("verify-otp-button");
const resetOtpButton = document.getElementById("reset-otp-button");
const otpRecaptchaContainer = document.getElementById("otp-recaptcha-container");
const otpStatusElement = document.getElementById("otp-status");
const otpAuthUserElement = document.getElementById("otp-auth-user");

const orderForm = document.getElementById("order-form");
const orderCustomerSelect = document.getElementById("order-customer");
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
const salesMtdElement = document.getElementById("sales-mtd");
const salesYtdElement = document.getElementById("sales-ytd");
const salesTableElement = document.getElementById("sales-table");
const ledgerSectionElement = document.getElementById("ledger-section");
const ledgerTitleElement = document.getElementById("ledger-title");
const ledgerSubtitleElement = document.getElementById("ledger-subtitle");
const ledgerPreviewElement = document.getElementById("ledger-preview");
const downloadLedgerButton = document.getElementById("download-ledger");
const paymentModalElement = document.getElementById("payment-modal");
const paymentForm = document.getElementById("payment-form");
const paymentCustomerNameInput = document.getElementById("payment-customer-name");
const paymentDateInput = document.getElementById("payment-date");
const paymentAmountInput = document.getElementById("payment-amount");
const paymentNotesInput = document.getElementById("payment-notes");
const closePaymentModalButton = document.getElementById("close-payment-modal");
const paymentSaveFeedbackElement = document.getElementById("payment-save-feedback");

document.querySelectorAll("[data-open-app]").forEach((button) => {
  button.addEventListener("click", () => openApp(button.dataset.openApp));
});
document.querySelectorAll("[data-toggle-card]").forEach((button) => {
  button.addEventListener("click", () => toggleCard(button.dataset.toggleCard));
});

if (saveDataButton) saveDataButton.addEventListener("click", handleSaveData);
if (saveDataHomeButton) saveDataHomeButton.addEventListener("click", handleSaveData);
loginForm.addEventListener("submit", handleLoginSubmit);
logoutButton.addEventListener("click", handleLogout);
backToHomeButton.addEventListener("click", closeAppView);
if (runMigrationButton) runMigrationButton.addEventListener("click", runMigration);
blackTrayMultiplierInput.addEventListener("change", handleBlackTrayMultiplierInput);
if (addCropButton) addCropButton.addEventListener("click", handleAddCrop);
customerForm.addEventListener("submit", handleCustomerSubmit);
addChefButton.addEventListener("click", () => addChefRow());
resetCustomerFormButton.addEventListener("click", resetCustomerForm);
billingPaymentCycleTypeInput.addEventListener("change", syncCustomerBillingTermFields);
skuForm.addEventListener("submit", handleSkuSubmit);
resetSkuFormButton.addEventListener("click", resetSkuForm);
titleForm.addEventListener("submit", handleTitleSubmit);
resetTitleFormButton.addEventListener("click", resetTitleForm);
userForm.addEventListener("submit", handleUserSubmit);
resetUserFormButton.addEventListener("click", resetUserForm);
otpUserSelect.addEventListener("change", handleOtpUserSelection);
otpModeSelect.addEventListener("change", handleOtpModeChange);
sendOtpButton.addEventListener("click", handleSendOtp);
verifyOtpButton.addEventListener("click", handleVerifyOtp);
resetOtpButton.addEventListener("click", handleResetOtpSession);
orderCustomerSelect.addEventListener("change", handleOrderCustomerSelection);
orderDateInput.addEventListener("change", updateOrderDueDateFromSelection);
addOrderItemButton.addEventListener("click", () => addOrderItemRow());
orderForm.addEventListener("submit", handleOrderSubmit);
resetOrderFormButton.addEventListener("click", resetOrderForm);
if (downloadInvoiceButton) downloadInvoiceButton.addEventListener("click", () => handleDownloadInvoice());
if (downloadLedgerButton) downloadLedgerButton.addEventListener("click", handleDownloadLedger);
paymentForm.addEventListener("submit", handlePaymentSubmit);
closePaymentModalButton.addEventListener("click", closePaymentModal);
paymentModalElement.addEventListener("click", (event) => {
  if (event.target === paymentModalElement) closePaymentModal();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".box-cell--interactive") && activeProjectedBoxTooltipKey) {
    activeProjectedBoxTooltipKey = "";
    renderBoxesTable();
  }
});

renderAll();
initRemoteState();

function createDefaultState() {
  return {
    blackTrayMultiplier: DEFAULT_BLACK_TRAY_MULTIPLIER,
    crops: [],
    seeding: createEmptySeedingData([]),
    customers: [],
    skus: [],
    titles: [],
    users: [],
    orders: [],
    payments: [],
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
  renderUserManagement();
  renderOtpApp();
  renderOrdering();
  renderAnalytics();
  renderSales();
  updateAuthUI();
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
        <th>Action</th>
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
          <td><button class="list-action list-action--danger crop-action" type="button" data-remove-crop="${crop.id}">Remove</button></td>
        </tr>
      `).join("")}
    </tbody>
  `;
  configTable.querySelectorAll(".config-input").forEach((input) => input.addEventListener("change", handleConfigInput));
  configTable.querySelectorAll("[data-remove-crop]").forEach((button) => {
    button.addEventListener("click", () => handleRemoveCrop(button.dataset.removeCrop));
  });
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
  seedingTable.querySelectorAll(".seeding-input").forEach((input) => input.addEventListener("change", handleSeedingInput));
}

function renderBoxesTable() {
  const harvestDates = getHarvestDatesForWindow();
  const anticipatedDemand = buildAnticipatedHarvestDemand(state.orders, harvestDates);
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
          ${harvestDates.map((date) => {
            const actualBoxes = getCropBoxesForHarvestDate(crop, date);
            const anticipatedBoxes = getAnticipatedBoxesForCell(anticipatedDemand.cropByDate, crop.id, date);
            return renderProjectedBoxesCell(
              actualBoxes,
              anticipatedBoxes,
              `${crop.id}|${toDateKey(date)}`,
              buildAnticipatedTrayPlan(crop, date, actualBoxes, anticipatedBoxes),
              shouldUnderlineAnticipatedDemand(crop, date, actualBoxes, anticipatedBoxes),
            );
          }).join("")}
        </tr>
      `).join("")}
      <tr class="totals-row">
        <td class="sticky-column">Total Boxes</td>
        ${harvestDates.map((date) => renderProjectedBoxesCell(
          getTotalBoxesForHarvestDate(date),
          getAnticipatedBoxesForCell(anticipatedDemand.totalByDate, "total", date),
          `total|${toDateKey(date)}`,
          "",
          false,
        )).join("")}
      </tr>
    </tbody>
  `;
  boxesTable.querySelectorAll(".box-cell__trigger").forEach((button) => {
    button.addEventListener("click", handleProjectedBoxTooltipToggle);
  });
  boxesTable.querySelectorAll(".box-cell__action").forEach((button) => {
    button.addEventListener("click", handleProjectedBoxAction);
  });
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
              <span>Invoicing: ${escapeHtml(formatInvoicingType(customer.invoicingType))}</span>
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

function renderUserManagement() {
  renderTitles();
  renderUsers();
  syncUserFormOptions();
  syncOtpUserOptions();
}

function renderOtpApp() {
  syncOtpUserOptions();
  updateOtpAuthUserDisplay(otpAuth?.currentUser || null);
  if (!otpModeSelect.value) otpModeSelect.value = "test";
  if (!otpStatusElement.textContent || otpStatusElement.textContent === "Firebase Auth SDK not initialized yet.") {
    setOtpStatus(getOtpReadinessMessage(), firebaseOtpAvailable() ? "neutral" : "error");
  }
}

function renderTitles() {
  titleFormTitleElement.textContent = editingTitleId ? "Edit Title" : "New Title";
  titleListElement.innerHTML = state.titles.length
    ? state.titles.map((title) => `
      <article class="list-card">
        <div class="list-card__header">
          <div>
            <h4>${escapeHtml(title.name)}</h4>
            <div class="list-card__meta">
              <span>${escapeHtml(title.description || "No description")}</span>
            </div>
          </div>
          <div class="list-card__actions">
            <button class="list-action" type="button" data-edit-title="${title.id}">Edit</button>
            <button class="list-action list-action--danger" type="button" data-delete-title="${title.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join("")
    : `<div class="empty-state">No titles yet.</div>`;

  titleListElement.querySelectorAll("[data-edit-title]").forEach((button) => {
    button.addEventListener("click", () => startEditingTitle(button.dataset.editTitle));
  });
  titleListElement.querySelectorAll("[data-delete-title]").forEach((button) => {
    button.addEventListener("click", () => deleteTitle(button.dataset.deleteTitle));
  });
}

function renderUsers() {
  userFormTitleElement.textContent = editingUserId ? "Edit User" : "New User";
  userListElement.innerHTML = state.users.length
    ? state.users.map((user) => {
      const title = findTitleById(user.titleId);
      const manager = findUserById(user.reportingManagerId);
      return `
        <article class="list-card">
          <div class="list-card__header">
            <div>
              <h4>${escapeHtml(getUserFullName(user))}</h4>
              <div class="list-card__meta">
                <span>Username: ${escapeHtml(user.username || "-")}</span>
                <span>Title: ${escapeHtml(title?.name || "Unassigned")}</span>
                <span>Reporting Manager: ${escapeHtml(manager ? getUserFullName(manager) : "-")}</span>
                <span>Phone: ${escapeHtml(user.phoneNumber)}</span>
                <span>Email: ${escapeHtml(user.emailAddress || "-")}</span>
              </div>
            </div>
            <div class="list-card__actions">
              <button class="list-action" type="button" data-edit-user="${user.id}">Edit</button>
              <button class="list-action list-action--danger" type="button" data-delete-user="${user.id}">Delete</button>
            </div>
          </div>
        </article>
      `;
    }).join("")
    : `<div class="empty-state">No users yet.</div>`;

  userListElement.querySelectorAll("[data-edit-user]").forEach((button) => {
    button.addEventListener("click", () => startEditingUser(button.dataset.editUser));
  });
  userListElement.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.deleteUser));
  });
}

function syncUserFormOptions() {
  const selectedTitleId = userTitleSelect.value;
  const selectedManagerId = userReportingManagerSelect.value;
  userTitleSelect.innerHTML = buildTitleOptions(selectedTitleId);
  userReportingManagerSelect.innerHTML = buildManagerOptions(editingUserId, selectedManagerId);
}

function buildTitleOptions(selectedTitleId = "") {
  const options = ['<option value="">Select title</option>'];
  state.titles
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((title) => {
      const selected = title.id === selectedTitleId ? " selected" : "";
      options.push(`<option value="${title.id}"${selected}>${escapeHtml(title.name)}</option>`);
    });
  return options.join("");
}

function buildManagerOptions(excludedUserId = "", selectedManagerId = "") {
  const options = ['<option value="">No reporting manager</option>'];
  state.users
    .filter((user) => user.id !== excludedUserId)
    .slice()
    .sort((left, right) => getUserFullName(left).localeCompare(getUserFullName(right)))
    .forEach((user) => {
      const selected = user.id === selectedManagerId ? " selected" : "";
      options.push(`<option value="${user.id}"${selected}>${escapeHtml(getUserFullName(user))}</option>`);
    });
  return options.join("");
}

function syncOtpUserOptions(selectedUserId = otpUserSelect.value) {
  if (!otpUserSelect) return;
  const options = ['<option value="">Manual phone entry</option>'];
  state.users
    .filter((user) => user.phoneNumber)
    .slice()
    .sort((left, right) => getUserFullName(left).localeCompare(getUserFullName(right)))
    .forEach((user) => {
      const selected = user.id === selectedUserId ? " selected" : "";
      options.push(`<option value="${user.id}"${selected}>${escapeHtml(getUserFullName(user))} - ${escapeHtml(user.phoneNumber)}</option>`);
    });
  otpUserSelect.innerHTML = options.join("");
  otpUserSelect.value = state.users.some((user) => user.id === selectedUserId) ? selectedUserId : "";
}

function renderOrdering() {
  renderOrderCustomerOptions();
  refreshOrderItemSkuOptions();
  renderOrdersList();
  ensureOrderDefaults();
  if (!orderItemsElement.children.length) {
    addOrderItemRow();
  }
}

function renderOrderCustomerOptions() {
  orderCustomerSelect.innerHTML = `<option value="">Select customer</option>${state.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.customerName)}</option>`).join("")}`;
}

function renderOrdersList() {
  const sortedOrders = getOrdersSortedNewestFirst();
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / ORDERS_PAGE_SIZE));
  currentOrdersPage = Math.max(1, Math.min(currentOrdersPage, totalPages));
  const startIndex = (currentOrdersPage - 1) * ORDERS_PAGE_SIZE;
  const pagedOrders = sortedOrders.slice(startIndex, startIndex + ORDERS_PAGE_SIZE);

  if (expandedOrderId && !pagedOrders.some((order) => order.id === expandedOrderId)) {
    expandedOrderId = null;
  }

  ordersListElement.innerHTML = sortedOrders.length
    ? `
      ${pagedOrders.map((order) => {
        const isExpanded = expandedOrderId === order.id;
        const displayCustomerName = getOrderDisplayCustomerName(order);
        return `
          <article class="list-card order-card ${isExpanded ? "order-card--expanded" : ""}">
            <button class="order-card__summary" type="button" data-toggle-order="${order.id}" aria-expanded="${isExpanded ? "true" : "false"}">
              <div>
                <h4>${escapeHtml(order.invoiceNumber)} | ${escapeHtml(displayCustomerName)}</h4>
                <div class="list-card__meta">
                  <span>Date: ${formatInvoiceDate(order.date)}</span>
                  <span>Total: ${formatCurrency(order.total)}</span>
                </div>
              </div>
              <span class="order-card__indicator">${isExpanded ? "Collapse" : "Expand"}</span>
            </button>
            <div class="order-card__details ${isExpanded ? "" : "hidden"}">
              <div class="list-card__details">
                <span>Customer Code: ${escapeHtml(order.customerCode || "-")}</span>
                <span>Items: ${(order.items || []).length}</span>
                <span>Due Date: ${formatInvoiceDate(order.dueDate)}</span>
              </div>
              <div class="list-card__actions">
                <button class="list-action" type="button" data-edit-order="${order.id}">Edit</button>
                <button class="list-action" type="button" data-generate-invoice="${order.id}">Download Invoice</button>
                <button class="list-action list-action--danger" type="button" data-delete-order="${order.id}">Delete</button>
              </div>
            </div>
          </article>
        `;
      }).join("")}
      <div class="list-pagination">
        <button class="secondary-button" type="button" data-orders-page="${currentOrdersPage - 1}" ${currentOrdersPage === 1 ? "disabled" : ""}>Previous</button>
        <span class="list-pagination__status">Page ${currentOrdersPage} of ${totalPages}</span>
        <button class="secondary-button" type="button" data-orders-page="${currentOrdersPage + 1}" ${currentOrdersPage === totalPages ? "disabled" : ""}>Next</button>
      </div>
    `
    : `<div class="empty-state">No orders saved yet.</div>`;

  ordersListElement.querySelectorAll("[data-toggle-order]").forEach((button) => {
    button.addEventListener("click", () => {
      expandedOrderId = expandedOrderId === button.dataset.toggleOrder ? null : button.dataset.toggleOrder;
      renderOrdersList();
    });
  });
  ordersListElement.querySelectorAll("[data-edit-order]").forEach((button) => button.addEventListener("click", () => startEditingOrder(button.dataset.editOrder)));
  ordersListElement.querySelectorAll("[data-generate-invoice]").forEach((button) => button.addEventListener("click", () => handleDownloadInvoice(button.dataset.generateInvoice)));
  ordersListElement.querySelectorAll("[data-delete-order]").forEach((button) => button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder)));
  ordersListElement.querySelectorAll("[data-orders-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentOrdersPage = toPositiveInteger(button.dataset.ordersPage, currentOrdersPage);
      expandedOrderId = null;
      renderOrdersList();
    });
  });
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

function renderSales() {
  if (!salesTableElement) return;

  const salesSummary = buildSalesSummary();
  salesMtdElement.textContent = formatCurrency(salesSummary.mtdSales);
  salesYtdElement.textContent = formatCurrency(salesSummary.ytdSales);
  salesTableElement.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-column">Customer Name</th>
        <th>Total Sale</th>
        <th>Total Amount Due</th>
        <th>Amount Received</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${salesSummary.rows.map((row) => `
        <tr>
          <td class="sticky-column">${escapeHtml(row.customerNamesLabel)}</td>
          <td>${formatCurrency(row.totalSale)}</td>
          <td>${formatCurrency(row.totalDue)}</td>
          <td>${formatCurrency(row.amountReceived)}</td>
          <td>
            <div class="table-action-group">
              <button class="list-action" type="button" data-open-payment="${escapeAttribute(row.billingOrganizationKey)}">Amount Received</button>
              <button class="list-action" type="button" data-open-ledger="${escapeAttribute(row.billingOrganizationKey)}">Download Ledger</button>
            </div>
          </td>
        </tr>
      `).join("")}
    </tbody>
  `;
  salesTableElement.querySelectorAll("[data-open-payment]").forEach((button) => {
    button.addEventListener("click", () => openPaymentModal(button.dataset.openPayment));
  });
  salesTableElement.querySelectorAll("[data-open-ledger]").forEach((button) => {
    button.addEventListener("click", () => handleDownloadLedger(button.dataset.openLedger));
  });
}

function getOrderDisplayCustomerName(order) {
  const matchedCustomer = state.customers.find((customer) =>
    (order.customerId && customer.id === order.customerId)
    || (order.customerCode && customer.customerCode === order.customerCode)
  );
  return matchedCustomer?.customerName || order.customerName || order.billing?.organization || "Unknown Customer";
}

function normalizeBilling(billing = {}) {
  const paymentCycleText = String(billing.paymentCycle || "").trim();
  let paymentCycleType = billing.paymentCycleType === "designated_day" ? "designated_day" : "days";
  let paymentCycleDays = toPositiveInteger(billing.paymentCycleDays, 0);
  let paymentCycleDayOfMonth = toPositiveInteger(billing.paymentCycleDayOfMonth, 0);

  if (!billing.paymentCycleType && paymentCycleText) {
    const dayMatch = paymentCycleText.match(/(\d+)/);
    if (paymentCycleText.toLowerCase().includes("month")) {
      paymentCycleType = "designated_day";
      paymentCycleDayOfMonth = dayMatch ? toPositiveInteger(dayMatch[1], 25) : 25;
    } else if (dayMatch) {
      paymentCycleType = "days";
      paymentCycleDays = toPositiveInteger(dayMatch[1], 30);
    }
  }

  if (paymentCycleType === "designated_day") {
    paymentCycleDayOfMonth = clampDayOfMonth(paymentCycleDayOfMonth || 25);
    paymentCycleDays = 0;
  } else {
    paymentCycleDays = toPositiveInteger(paymentCycleDays || paymentCycleText, 30);
    paymentCycleDayOfMonth = 0;
  }

  return {
    organization: billing.organization || "",
    address: billing.address || "",
    gst: billing.gst || "",
    phone: billing.phone || "",
    paymentCycleType,
    paymentCycleDays,
    paymentCycleDayOfMonth,
    paymentCycle: formatBillingTermLabel({
      paymentCycleType,
      paymentCycleDays,
      paymentCycleDayOfMonth,
    }),
  };
}

function formatBillingTermLabel(billing) {
  if (billing.paymentCycleType === "designated_day") {
    return `Due on ${billing.paymentCycleDayOfMonth}${getOrdinalSuffix(billing.paymentCycleDayOfMonth)} of the month`;
  }
  return `${billing.paymentCycleDays} days`;
}

function updateOrderDueDateFromSelection() {
  if (editingOrderId) return;
  const customer = state.customers.find((item) => item.id === orderCustomerSelect.value);
  const billing = normalizeBilling(customer?.billing || {});
  const invoiceDate = orderDateInput.value || toInputDate(today);
  orderDueDateInput.value = computeDueDateForBilling(billing, invoiceDate);
}

function computeDueDateForBilling(billing, invoiceDate) {
  const date = startOfDay(new Date(invoiceDate));
  if (Number.isNaN(date.getTime())) {
    return toInputDate(addDays(today, 30));
  }
  if (billing.paymentCycleType === "designated_day") {
    const targetDay = clampDayOfMonth(billing.paymentCycleDayOfMonth || 25);
    let dueYear = date.getFullYear();
    let dueMonth = date.getMonth();
    if (date.getDate() >= targetDay) {
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }
    const lastDay = new Date(dueYear, dueMonth + 1, 0).getDate();
    return toInputDate(new Date(dueYear, dueMonth, Math.min(targetDay, lastDay)));
  }
  return toInputDate(addDays(date, toPositiveInteger(billing.paymentCycleDays, 30)));
}

function getInvoicePaymentTermsText(billing) {
  const normalized = normalizeBilling(billing);
  if (normalized.paymentCycleType === "designated_day") {
    return `Total payment due on the ${normalized.paymentCycleDayOfMonth}${getOrdinalSuffix(normalized.paymentCycleDayOfMonth)} of the applicable month`;
  }
  return `Total payment due in ${normalized.paymentCycleDays} days`;
}

function clampDayOfMonth(day) {
  return Math.max(1, Math.min(31, toPositiveInteger(day, 25)));
}

function getOrdinalSuffix(day) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  const mod10 = day % 10;
  if (mod10 === 1) return "st";
  if (mod10 === 2) return "nd";
  if (mod10 === 3) return "rd";
  return "th";
}

function openApp(appKey) {
  if (!activeUserId) return;
  landingView.classList.add("hidden");
  appView.classList.remove("hidden");
  Object.entries(appPanels).forEach(([key, panel]) => panel.classList.toggle("hidden", key !== appKey));
  activeAppTagElement.textContent = appMeta[appKey].tag;
  activeAppTitleElement.textContent = appMeta[appKey].title;
  activeAppSubtitleElement.textContent = appMeta[appKey].subtitle;
  if (appKey === "otp") renderOtpApp();
  if (appKey === "analytics") renderAnalytics();
  if (appKey === "sales") renderSales();
}

function closeAppView() {
  if (!activeUserId) return;
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

function handleAddCrop() {
  const nextIndex = state.crops.length + 1;
  const referenceCrop = state.crops[state.crops.length - 1] || {};
  const crop = {
    id: createId("crop"),
    name: `New Microgreen ${nextIndex}`,
    greenSeedGrams: toPositiveNumber(referenceCrop.greenSeedGrams, 300),
    harvestDays: toPositiveInteger(referenceCrop.harvestDays, DEFAULT_REFERENCE_HARVEST_DAYS),
    greenTrayYieldBoxes: toPositiveNumber(referenceCrop.greenTrayYieldBoxes, 8),
  };
  state.crops.push(crop);
  initializeCropSeedingState(crop.id);
  renderYield();
  markDirty({ immediate: true });
}

function handleRemoveCrop(cropId) {
  state.crops = state.crops.filter((crop) => crop.id !== cropId);
  delete state.seeding[cropId];
  renderYield();
  markDirty({ immediate: true });
}

function handleCustomerSubmit(event) {
  event.preventDefault();
  const billing = buildBillingFromCustomerForm();
  const payload = {
    id: editingCustomerId || createId("customer"),
    customerName: document.getElementById("customer-name").value.trim(),
    customerCode: document.getElementById("customer-code").value.trim(),
    mapLink: document.getElementById("customer-map-link").value.trim(),
    contactName: document.getElementById("customer-contact-name").value.trim(),
    contactNumber: document.getElementById("customer-contact-number").value.trim(),
    invoicingType: normalizeInvoicingType(customerInvoicingTypeInput.value),
    billing,
    chefs: collectChefRows(),
  };
  upsertCustomer(payload);
  editingCustomerId = null;
  resetCustomerFormFields();
  renderCustomers();
  renderOrdering();
  renderSales();
  markDirty({ immediate: true });
  showSaveFeedback(customerSaveFeedbackElement);
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
  const billing = normalizeBilling(customer.billing);
  editingCustomerId = customerId;
  document.getElementById("customer-name").value = customer.customerName;
  document.getElementById("customer-code").value = customer.customerCode || "";
  document.getElementById("customer-map-link").value = customer.mapLink;
  document.getElementById("customer-contact-name").value = customer.contactName;
  document.getElementById("customer-contact-number").value = customer.contactNumber;
  customerInvoicingTypeInput.value = normalizeInvoicingType(customer.invoicingType);
  document.getElementById("billing-organization").value = billing.organization;
  document.getElementById("billing-address").value = billing.address;
  document.getElementById("billing-gst").value = billing.gst;
  document.getElementById("billing-phone").value = billing.phone;
  billingPaymentCycleTypeInput.value = billing.paymentCycleType;
  billingPaymentCycleDaysInput.value = billing.paymentCycleDays ? String(billing.paymentCycleDays) : "";
  billingPaymentCycleDayInput.value = billing.paymentCycleDayOfMonth ? String(billing.paymentCycleDayOfMonth) : "";
  syncCustomerBillingTermFields();
  chefListElement.innerHTML = "";
  customer.chefs.forEach((chef) => addChefRow(chef));
}

function deleteCustomer(customerId) {
  state.customers = state.customers.filter((customer) => customer.id !== customerId);
  state.payments = state.payments.filter((payment) => payment.customerId !== customerId);
  renderCustomers();
  renderOrdering();
  renderSales();
  markDirty({ immediate: true });
}

function resetCustomerForm() {
  editingCustomerId = null;
  resetCustomerFormFields();
}

function resetCustomerFormFields() {
  customerForm.reset();
  customerInvoicingTypeInput.value = "formal";
  billingPaymentCycleTypeInput.value = "days";
  billingPaymentCycleDaysInput.value = "30";
  billingPaymentCycleDayInput.value = "";
  syncCustomerBillingTermFields();
  chefListElement.innerHTML = "";
}

function buildBillingFromCustomerForm() {
  return normalizeBilling({
    organization: document.getElementById("billing-organization").value.trim(),
    address: document.getElementById("billing-address").value.trim(),
    gst: document.getElementById("billing-gst").value.trim(),
    phone: document.getElementById("billing-phone").value.trim(),
    paymentCycleType: billingPaymentCycleTypeInput.value,
    paymentCycleDays: billingPaymentCycleDaysInput.value,
    paymentCycleDayOfMonth: billingPaymentCycleDayInput.value,
  });
}

function syncCustomerBillingTermFields() {
  const isDesignatedDay = billingPaymentCycleTypeInput.value === "designated_day";
  billingPaymentCycleDaysField.classList.toggle("hidden", isDesignatedDay);
  billingPaymentCycleDayField.classList.toggle("hidden", !isDesignatedDay);
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
  markDirty({ immediate: true });
  showSaveFeedback(skuSaveFeedbackElement);
}

function handleTitleSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("job-title-name").value.trim();
  const description = document.getElementById("job-title-description").value.trim();
  if (!name || !description) return;
  const payload = {
    id: editingTitleId || createId("title"),
    name,
    description,
  };
  const index = state.titles.findIndex((title) => title.id === payload.id);
  if (index >= 0) state.titles[index] = payload;
  else state.titles.push(payload);
  editingTitleId = null;
  resetTitleFormFields();
  renderUserManagement();
  markDirty({ immediate: true });
  showSaveFeedback(titleSaveFeedbackElement);
}

async function handleUserSubmit(event) {
  event.preventDefault();
  try {
    const firstName = document.getElementById("user-first-name").value.trim();
    const lastName = document.getElementById("user-last-name").value.trim();
    const username = document.getElementById("user-username").value.trim();
    const passwordInput = document.getElementById("user-password");
    const password = passwordInput.value.trim();
    const phoneNumber = document.getElementById("user-phone-number").value.trim();
    const existingUser = editingUserId ? findUserById(editingUserId) : null;
    const passwordHash = password
      ? await hashPassword(password)
      : String(existingUser?.passwordHash || existingUser?.password || "").trim();
    if (!firstName || !lastName || !username || !passwordHash || !phoneNumber || !userTitleSelect.value) return;
    const payload = {
      id: editingUserId || createId("user"),
      firstName,
      lastName,
      username,
      passwordHash,
      titleId: userTitleSelect.value,
      reportingManagerId: userReportingManagerSelect.value,
      phoneNumber,
      emailAddress: document.getElementById("user-email-address").value.trim(),
    };
    if (payload.reportingManagerId === payload.id) {
      payload.reportingManagerId = "";
    }
    const index = state.users.findIndex((user) => user.id === payload.id);
    if (index >= 0) state.users[index] = payload;
    else state.users.push(payload);
    editingUserId = null;
    resetUserFormFields();
    renderUserManagement();
    markDirty({ immediate: true });
    showSaveFeedback(userSaveFeedbackElement);
  } catch (error) {
    setSyncStatus(String(error?.message || "Unable to hash the password."));
  }
}

function startEditingSku(skuId) {
  const sku = state.skus.find((item) => item.id === skuId);
  if (!sku) return;
  editingSkuId = sku.id;
  document.getElementById("sku-name").value = sku.name;
  document.getElementById("sku-price").value = sku.price;
  document.getElementById("sku-hsn").value = sku.hsn;
}

function startEditingTitle(titleId) {
  const title = findTitleById(titleId);
  if (!title) return;
  editingTitleId = title.id;
  document.getElementById("job-title-name").value = title.name;
  document.getElementById("job-title-description").value = title.description || "";
  renderTitles();
}

function startEditingUser(userId) {
  const user = findUserById(userId);
  if (!user) return;
  editingUserId = user.id;
  document.getElementById("user-first-name").value = user.firstName;
  document.getElementById("user-last-name").value = user.lastName;
  document.getElementById("user-username").value = user.username || "";
  document.getElementById("user-password").value = "";
  document.getElementById("user-phone-number").value = user.phoneNumber;
  document.getElementById("user-email-address").value = user.emailAddress || "";
  syncUserPasswordRequirement();
  syncUserFormOptions();
  userTitleSelect.value = user.titleId || "";
  userReportingManagerSelect.value = user.reportingManagerId || "";
  renderUsers();
}

function deleteSku(skuId) {
  state.skus = state.skus.filter((sku) => sku.id !== skuId);
  renderSkus();
  renderOrdering();
  markDirty({ immediate: true });
}

function deleteTitle(titleId) {
  state.titles = state.titles.filter((title) => title.id !== titleId);
  state.users = state.users.map((user) => ({
    ...user,
    titleId: user.titleId === titleId ? "" : user.titleId,
  }));
  if (editingTitleId === titleId) {
    editingTitleId = null;
    resetTitleFormFields();
  }
  renderUserManagement();
  markDirty({ immediate: true });
}

function deleteUser(userId) {
  state.users = state.users
    .filter((user) => user.id !== userId)
    .map((user) => ({
      ...user,
      reportingManagerId: user.reportingManagerId === userId ? "" : user.reportingManagerId,
    }));
  if (editingUserId === userId) {
    editingUserId = null;
    resetUserFormFields();
  }
  renderUserManagement();
  markDirty({ immediate: true });
}

function resetSkuForm() {
  editingSkuId = null;
  skuForm.reset();
}

function resetTitleForm() {
  editingTitleId = null;
  resetTitleFormFields();
  renderTitles();
}

function resetTitleFormFields() {
  titleForm.reset();
}

function resetUserForm() {
  editingUserId = null;
  resetUserFormFields();
  renderUsers();
}

function resetUserFormFields() {
  userForm.reset();
  syncUserPasswordRequirement();
  syncUserFormOptions();
  userTitleSelect.value = "";
  userReportingManagerSelect.value = "";
}

function syncUserPasswordRequirement() {
  const passwordInput = document.getElementById("user-password");
  if (!passwordInput) return;
  passwordInput.required = !editingUserId;
  passwordInput.placeholder = editingUserId ? "Leave blank to keep current password" : "";
}

function handleOtpUserSelection() {
  const user = findUserById(otpUserSelect.value);
  if (!user) return;
  otpPhoneNumberInput.value = user.phoneNumber || "";
  if (isValidOtpPhoneNumber(otpPhoneNumberInput.value.trim())) {
    setOtpStatus("Selected user's phone is ready for OTP testing.", "neutral");
  } else {
    setOtpStatus("Selected user's phone must be converted to E.164 format, for example +919876543210.", "error");
  }
}

function handleOtpModeChange() {
  otpConfirmationResult = null;
  otpCodeInput.value = "";
  resetOtpVerifierState();
  if (otpModeSelect.value === "test") {
    setOtpStatus("Test mode enabled. Firebase test phone numbers do not require a real SMS and should auto-resolve app verification.", "neutral");
  } else {
    setOtpStatus("Live mode enabled. Complete the reCAPTCHA challenge and Firebase will attempt a real SMS send.", "neutral");
  }
}

async function handleSendOtp() {
  const phoneNumber = otpPhoneNumberInput.value.trim();
  if (!isValidOtpPhoneNumber(phoneNumber)) {
    setOtpStatus("Enter a valid E.164 phone number, for example +919876543210.", "error");
    return;
  }

  sendOtpButton.disabled = true;
  try {
    const auth = await ensureOtpAuthReady();
    const appVerifier = await ensureOtpRecaptchaVerifier();
    otpConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
    otpCodeInput.focus();
    setOtpStatus(`OTP sent to ${phoneNumber}. Enter the 6-digit code to verify.`, "success");
  } catch (error) {
    resetOtpRecaptcha();
    setOtpStatus(getOtpErrorMessage(error), "error");
  } finally {
    sendOtpButton.disabled = false;
  }
}

async function handleVerifyOtp() {
  const code = otpCodeInput.value.trim();
  if (!otpConfirmationResult) {
    setOtpStatus("Send an OTP first.", "error");
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    setOtpStatus("Enter the 6-digit OTP code.", "error");
    return;
  }

  verifyOtpButton.disabled = true;
  try {
    const result = await otpConfirmationResult.confirm(code);
    updateOtpAuthUserDisplay(result.user);
    setOtpStatus(`OTP verified for ${result.user.phoneNumber || "the selected number"}.`, "success");
  } catch (error) {
    setOtpStatus(getOtpErrorMessage(error), "error");
  } finally {
    verifyOtpButton.disabled = false;
  }
}

async function handleResetOtpSession() {
  otpConfirmationResult = null;
  otpCodeInput.value = "";
  otpPhoneNumberInput.value = "";
  otpUserSelect.value = "";
  resetOtpVerifierState();
  if (otpAuth?.currentUser) {
    await otpAuth.signOut();
  }
  updateOtpAuthUserDisplay(null);
  setOtpStatus("OTP test session reset.", "neutral");
}

function handleOrderCustomerSelection() {
  const customer = state.customers.find((item) => item.id === orderCustomerSelect.value);
  if (!customer) {
    orderCustomerCodeInput.value = "";
    orderBillingOrganizationInput.value = "";
    orderBillingAddressInput.value = "";
    orderBillingGstInput.value = "";
    orderBillingPhoneInput.value = "";
    orderBillingPaymentCycleInput.value = "";
    if (!editingOrderId) {
      orderInvoiceNumberInput.value = getNextInvoiceNumber();
    }
    updateOrderDueDateFromSelection();
    return;
  }
  const billing = normalizeBilling(customer.billing);
  orderCustomerCodeInput.value = customer.customerCode || "";
  orderBillingOrganizationInput.value = billing.organization || "";
  orderBillingAddressInput.value = billing.address || "";
  orderBillingGstInput.value = billing.gst || "";
  orderBillingPhoneInput.value = billing.phone || "";
  orderBillingPaymentCycleInput.value = billing.paymentCycle || "";
  if (!editingOrderId) {
    orderInvoiceNumberInput.value = getNextInvoiceNumber(customer);
  }
  updateOrderDueDateFromSelection();
}

function addOrderItemRow(item = { skuId: "", quantity: 1, price: "", amount: "" }) {
  const row = document.createElement("div");
  row.className = "order-item";
  const initialQuantity = toPositiveInteger(item.quantity, 1) || 1;
  const initialPrice = item.price !== undefined && item.price !== "" ? formatNumber(item.price) : "";
  const initialAmount = item.amount !== undefined && item.amount !== "" ? formatNumber(item.amount) : "";
  row.innerHTML = `
    <label class="form-field">
      <span>Product</span>
      <select data-order-field="skuId">${renderSkuOptions(item.skuId)}</select>
    </label>
    <label class="form-field">
      <span>Quantity</span>
      <input data-order-field="quantity" type="number" min="1" step="1" value="${initialQuantity}">
    </label>
    <label class="form-field">
      <span>MRP</span>
      <input data-order-field="price" type="number" min="0" step="0.01" value="${initialPrice}" readonly>
    </label>
    <label class="form-field">
      <span>Amount</span>
      <input data-order-field="amount" type="number" min="0" step="0.01" value="${initialAmount}">
    </label>
    <button class="list-action list-action--danger" type="button">Remove</button>
  `;
  const skuSelect = row.querySelector('[data-order-field="skuId"]');
  const quantityInput = row.querySelector('[data-order-field="quantity"]');
  const priceInput = row.querySelector('[data-order-field="price"]');
  const amountInput = row.querySelector('[data-order-field="amount"]');

  skuSelect.addEventListener("change", () => applyOrderItemDefaults(row, { resetPrice: true, resetAmount: true }));
  quantityInput.addEventListener("change", () => applyOrderItemDefaults(row, { resetPrice: true, resetAmount: true }));
  row.querySelector("button").addEventListener("click", () => row.remove());
  orderItemsElement.appendChild(row);
  if (!initialPrice && !initialAmount) {
    applyOrderItemDefaults(row, { resetPrice: true, resetAmount: true });
  }
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

function applyOrderItemDefaults(row, { resetPrice = false, resetAmount = false } = {}) {
  const sku = state.skus.find((item) => item.id === row.querySelector('[data-order-field="skuId"]').value);
  const quantityInput = row.querySelector('[data-order-field="quantity"]');
  const priceInput = row.querySelector('[data-order-field="price"]');
  const amountInput = row.querySelector('[data-order-field="amount"]');
  const quantity = Math.max(1, toPositiveInteger(quantityInput.value, 1));
  quantityInput.value = String(quantity);

  if (sku && resetPrice) {
    priceInput.value = formatNumber(sku.price);
  }

  const price = toPositiveNumber(priceInput.value, sku?.price || 0);
  if (resetAmount) {
    amountInput.value = formatNumber(price * quantity);
  }
}

function handleOrderSubmit(event) {
  event.preventDefault();
  const selectedCustomer = state.customers.find((item) => item.id === orderCustomerSelect.value);
  if (!selectedCustomer) {
    setSyncStatus("Select a customer from the list");
    return;
  }
  const items = Array.from(orderItemsElement.querySelectorAll(".order-item")).map((row) => {
    const sku = state.skus.find((item) => item.id === row.querySelector('[data-order-field="skuId"]').value);
    const quantity = toPositiveInteger(row.querySelector('[data-order-field="quantity"]').value, 0);
    const price = toPositiveNumber(row.querySelector('[data-order-field="price"]').value, sku?.price || 0);
    const amount = toPositiveNumber(row.querySelector('[data-order-field="amount"]').value, price * quantity);
    if (!sku || quantity <= 0) return null;
    return {
      skuId: sku.id,
      description: sku.name,
      hsn: sku.hsn,
      quantity,
      price,
      amount,
    };
  }).filter(Boolean);
  if (!items.length) {
    setSyncStatus("Add at least one valid product");
    return;
  }

  const normalizedBilling = normalizeBilling({
    organization: orderBillingOrganizationInput.value.trim(),
    address: orderBillingAddressInput.value.trim(),
    gst: orderBillingGstInput.value.trim(),
    phone: orderBillingPhoneInput.value.trim(),
    paymentCycle: orderBillingPaymentCycleInput.value.trim(),
    paymentCycleType: selectedCustomer.billing?.paymentCycleType,
    paymentCycleDays: selectedCustomer.billing?.paymentCycleDays,
    paymentCycleDayOfMonth: selectedCustomer.billing?.paymentCycleDayOfMonth,
  });

  const customerPayload = {
    ...selectedCustomer,
    invoicingType: normalizeInvoicingType(selectedCustomer.invoicingType),
    customerCode: orderCustomerCodeInput.value.trim(),
    billing: normalizedBilling,
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
    invoicingType: customerPayload.invoicingType,
    billing: { ...normalizedBilling },
    date: orderDateInput.value || toInputDate(today),
    invoiceNumber: orderInvoiceNumberInput.value.trim() || getNextInvoiceNumber(customerPayload),
    dueDate: computeDueDateForBilling(normalizedBilling, orderDateInput.value || toInputDate(today)),
    discountPercent,
    subtotal,
    discountAmount,
    total,
    items,
  };

  const index = state.orders.findIndex((order) => order.id === orderPayload.id);
  if (index >= 0) state.orders[index] = orderPayload;
  else state.orders.push(orderPayload);

  currentOrdersPage = 1;
  expandedOrderId = orderPayload.id;
  editingOrderId = null;
  resetOrderForm();
  renderCustomers();
  renderOrdering();
  renderAnalytics();
  renderSales();
  markDirty({ immediate: true });
  setSyncStatus("Order saved");
  showSaveFeedback(orderSaveFeedbackElement);
}

function startEditingOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  expandedOrderId = orderId;
  editingOrderId = order.id;
  orderCustomerSelect.value = order.customerId || "";
  orderCustomerCodeInput.value = order.customerCode || "";
  orderDateInput.value = order.date;
  orderInvoiceNumberInput.value = order.invoiceNumber;
  orderDueDateInput.value = order.dueDate;
  orderBillingOrganizationInput.value = order.billing.organization;
  orderBillingAddressInput.value = order.billing.address;
  orderBillingGstInput.value = order.billing.gst;
  orderBillingPhoneInput.value = order.billing.phone;
  orderBillingPaymentCycleInput.value = normalizeBilling(order.billing).paymentCycle;
  orderDiscountPercentInput.value = order.discountPercent;
  orderItemsElement.innerHTML = "";
  order.items.forEach((item) => addOrderItemRow(item));
}

function deleteOrder(orderId) {
  state.orders = state.orders.filter((order) => order.id !== orderId);
  if (expandedOrderId === orderId) {
    expandedOrderId = null;
  }
  if (currentInvoiceOrderId === orderId) {
    currentInvoiceOrderId = null;
  }
  renderOrdering();
  renderAnalytics();
  renderSales();
  markDirty({ immediate: true });
}

function resetOrderForm() {
  editingOrderId = null;
  orderForm.reset();
  orderCustomerSelect.value = "";
  handleOrderCustomerSelection();
  orderItemsElement.innerHTML = "";
  addOrderItemRow();
  ensureOrderDefaults();
}

function ensureOrderDefaults() {
  if (!orderDateInput.value) orderDateInput.value = toInputDate(today);
  if (!editingOrderId) {
    const selectedCustomer = state.customers.find((item) => item.id === orderCustomerSelect.value) || null;
    orderInvoiceNumberInput.value = getNextInvoiceNumber(selectedCustomer);
    updateOrderDueDateFromSelection();
  }
  if (!orderDiscountPercentInput.value) orderDiscountPercentInput.value = "0";
}

function generateInvoiceFromOrder(orderId) {
  handleDownloadInvoice(orderId);
}

function buildInvoiceMarkup(order) {
  return `<div class="invoice-sheet"><div class="invoice-top"><div class="invoice-brand"><img src="${companyDetails.logoPath}" alt="Leaf Over Logic logo" class="invoice-logo"><h3>${escapeHtml(companyDetails.name)}</h3>${companyDetails.address.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}<div>Phone: ${escapeHtml(companyDetails.phone)}</div><div>Website: ${escapeHtml(companyDetails.website)}</div></div><div class="invoice-meta"><h3>INVOICE</h3><table><tr><td>DATE</td><td>${formatInvoiceDate(order.date)}</td></tr><tr><td>INVOICE #</td><td>${escapeHtml(order.invoiceNumber)}</td></tr><tr><td>CUSTOMER ID</td><td>${escapeHtml(order.customerCode)}</td></tr><tr><td>DUE DATE</td><td>${formatInvoiceDate(order.dueDate)}</td></tr></table></div></div><div class="invoice-grid"><div class="invoice-block"><h4>BILL TO</h4><div class="invoice-block__body"><div>${escapeHtml(order.billing.organization || order.customerName)}</div>${order.billing.address.split("\n").filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join("")}<div>GSTIN/UIN: ${escapeHtml(order.billing.gst || "-")}</div><div>Ph: ${escapeHtml(order.billing.phone || "-")}</div></div></div><div class="invoice-block"><h4>Account Details</h4><div class="invoice-block__body"><div>Beneficiary Name: ${escapeHtml(companyDetails.account.beneficiary)}</div><div>Account Number: ${escapeHtml(companyDetails.account.number)}</div><div>IFSC Code: ${escapeHtml(companyDetails.account.ifsc)}</div><div>Branch: ${escapeHtml(companyDetails.account.branch)}</div><div>Bank: ${escapeHtml(companyDetails.account.bank)}</div></div></div></div><table class="invoice-table"><thead><tr><th>No.</th><th>Product</th><th>Description</th><th>HSN</th><th>QTY</th><th>MRP</th><th>AMOUNT</th></tr></thead><tbody>${order.items.map((item, index) => `<tr><td>${index + 1}</td><td>Rozana Greens Microgreens</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.hsn)}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.amount)}</td></tr>`).join("")}</tbody></table><div class="invoice-grid"><div class="invoice-terms"><h4>Terms & Conditions</h4><div class="invoice-terms__body"><div>1. ${escapeHtml(getInvoicePaymentTermsText(order.billing))}</div><div>2. Please include the invoice number on your check</div></div></div><div class="invoice-total"><div class="invoice-total__row"><span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong></div><div class="invoice-total__row"><span>Discount</span><strong>${formatCurrency(order.discountAmount)}</strong></div><div class="invoice-total__row"><span>GST amount</span><strong>-</strong></div><div class="invoice-total__row"><span>Other</span><strong>-</strong></div><div class="invoice-total__row invoice-total__row--strong"><span>TOTAL</span><strong>${formatCurrency(order.total)}</strong></div><div style="margin-top:12px;">Make all checks payable to ${escapeHtml(companyDetails.account.beneficiary)}</div></div></div><div class="invoice-footnote">If you have any questions about this invoice, please contact<br>${escapeHtml(companyDetails.contactFooter)}<br><strong>Thank You For Your Business!</strong></div></div>`;
}

function handleDownloadInvoice(orderId = currentInvoiceOrderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) {
    setSyncStatus("Generate invoice first");
    return;
  }
  currentInvoiceOrderId = order.id;
  const invoiceFileName = buildInvoiceFileName(order);
  const printWindow = window.open("", "_blank", "width=1200,height=900");
  const stylesheetUrl = new URL("styles.css", window.location.href).href;
  const printMarkup = `
    <html>
      <head>
        <title>${escapeHtml(invoiceFileName)}</title>
        <base href="${window.location.href}">
        <link rel="stylesheet" href="${stylesheetUrl}">
      </head>
      <body class="print-window">
        ${buildInvoiceMarkup(order)}
      </body>
    </html>
  `;
  printWindow.document.write(printMarkup);
  printWindow.document.close();
  printWindow.addEventListener("load", () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }, { once: true });
}

function buildInvoiceFileName(order) {
  const invoiceNumber = String(order?.invoiceNumber || "").trim() || "invoice";
  const customerName = getOrderDisplayCustomerName(order || {});
  const firstCustomerName = String(customerName || "")
    .trim()
    .split(/\s+/)
    .find(Boolean) || "Customer";
  const safeCustomerName = firstCustomerName.replace(/[^a-zA-Z0-9]/g, "") || "Customer";
  return `${invoiceNumber}_Invoice_${safeCustomerName}`;
}

function openPaymentModal(billingOrganizationKey) {
  const salesRow = buildSalesSummary().rows.find((row) => row.billingOrganizationKey === billingOrganizationKey);
  if (!salesRow) {
    setSyncStatus("Billing organization not found");
    return;
  }
  paymentModalElement.dataset.billingOrganizationKey = salesRow.billingOrganizationKey;
  paymentCustomerNameInput.value = salesRow.customerNamesLabel || "";
  paymentDateInput.value = toInputDate(today);
  paymentAmountInput.value = "";
  paymentNotesInput.value = "";
  paymentModalElement.classList.remove("hidden");
}

function closePaymentModal() {
  paymentModalElement.classList.add("hidden");
  paymentModalElement.dataset.billingOrganizationKey = "";
  paymentForm.reset();
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  const billingOrganizationKey = paymentModalElement.dataset.billingOrganizationKey || "";
  const salesRow = buildSalesSummary().rows.find((row) => row.billingOrganizationKey === billingOrganizationKey);
  const amount = toPositiveNumber(paymentAmountInput.value, 0);
  if (!salesRow) {
    setSyncStatus("Billing organization not found");
    return;
  }
  if (amount <= 0) {
    setSyncStatus("Enter a valid received amount");
    return;
  }

  state.payments.push({
    id: createId("payment"),
    billingOrganizationKey: salesRow.billingOrganizationKey,
    billingOrganization: salesRow.billingOrganization,
    customerNamesLabel: salesRow.customerNamesLabel,
    date: paymentDateInput.value || toInputDate(today),
    amount,
    notes: paymentNotesInput.value.trim(),
  });

  renderSales();
  markDirty({ immediate: true });
  setSyncStatus("Amount received recorded");
  showSaveFeedback(paymentSaveFeedbackElement);
  window.setTimeout(() => {
    closePaymentModal();
  }, 900);
}

function upsertCustomer(payload) {
  payload.invoicingType = normalizeInvoicingType(payload.invoicingType);
  payload.billing = normalizeBilling(payload.billing);
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
    markDirty({ immediate: true });
    setSyncStatus(`Migration data loaded (${migratedOrders.length} orders).`);
  } catch (error) {
    console.error("Migration load failed:", error);
    setSyncStatus(`Migration failed: ${String(error?.message || "Unknown error").slice(0, 80)}`);
  }
}

async function handleSaveData() {
  scheduleStateSave(0);
  await saveStateToFirebase();
}

async function initRemoteState() {
  if (!firebaseSettings.enabled || !hasFirebaseConfig(firebaseSettings.config)) {
    setSyncStatus("Firebase not configured");
    renderOtpApp();
    initializeAuthState();
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
      renderOtpApp();
    }
    initializeAuthState();
  } catch (error) {
    cloudSyncEnabled = false;
    console.error("Firebase init failed:", error);
    setSyncStatus(getFirebaseErrorMessage(error, "Init failed"));
    renderOtpApp();
    initializeAuthState();
  }
}

async function saveStateToFirebase() {
  if (saveInFlight) {
    pendingImmediateSave = true;
    return;
  }
  if (!cloudSyncEnabled || !isDirty) return;

  const changeSequenceAtStart = changeSequence;
  saveInFlight = true;
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
    if (changeSequence === changeSequenceAtStart) {
      isDirty = false;
      setSyncStatus("Saved to Firebase");
    } else {
      setSyncStatus("Saving changes...");
    }
  } catch (error) {
    console.error("Firebase save failed:", error);
    setSyncStatus(getFirebaseErrorMessage(error, "Save failed"));
  } finally {
    saveInFlight = false;
    if (cloudSyncEnabled && isDirty) {
      const nextDelay = pendingImmediateSave ? 0 : AUTO_SAVE_DELAY_MS;
      pendingImmediateSave = false;
      scheduleStateSave(nextDelay);
    }
  }
}

function serializeState() {
  return {
    blackTrayMultiplier: state.blackTrayMultiplier,
    crops: state.crops,
    seeding: state.seeding,
    customers: state.customers,
    skus: state.skus,
    titles: state.titles,
    users: state.users,
    orders: state.orders,
    payments: state.payments,
  };
}

function applySerializedState(rawState) {
  state.blackTrayMultiplier = toPositiveNumber(rawState.blackTrayMultiplier, DEFAULT_BLACK_TRAY_MULTIPLIER);
  state.crops = Array.isArray(rawState.crops) ? rawState.crops : [];
  state.seeding = createSeedState(state.crops, rawState.seeding);
  state.customers = Array.isArray(rawState.customers)
    ? rawState.customers.map((customer) => ({
      ...customer,
      invoicingType: normalizeInvoicingType(customer.invoicingType),
      billing: normalizeBilling(customer.billing),
    }))
    : [];
  state.skus = Array.isArray(rawState.skus) ? rawState.skus : [];
  state.titles = Array.isArray(rawState.titles)
    ? rawState.titles.map((title) => ({
      id: title.id || createId("title"),
      name: String(title.name || "").trim(),
      description: String(title.description || "").trim(),
    })).filter((title) => title.name)
    : [];
  state.users = Array.isArray(rawState.users)
    ? rawState.users.map((user) => ({
      id: user.id || createId("user"),
      firstName: String(user.firstName || "").trim(),
      lastName: String(user.lastName || "").trim(),
      username: String(user.username || "").trim(),
      passwordHash: String(user.passwordHash || user.password || "").trim(),
      titleId: String(user.titleId || "").trim(),
      reportingManagerId: String(user.reportingManagerId || "").trim(),
      phoneNumber: String(user.phoneNumber || "").trim(),
      emailAddress: String(user.emailAddress || "").trim(),
    })).filter((user) => user.firstName && user.lastName && user.username && user.passwordHash && user.phoneNumber)
    : [];
  state.orders = Array.isArray(rawState.orders)
    ? rawState.orders.map((order) => ({
      ...order,
      invoicingType: normalizeInvoicingType(order.invoicingType),
      billing: normalizeBilling(order.billing),
    }))
    : [];
  state.payments = Array.isArray(rawState.payments)
    ? rawState.payments.map((payment) => ({
      ...payment,
      billingOrganizationKey: payment.billingOrganizationKey || normalizeBillingOrganizationKey(payment.billingOrganization || payment.customerName || ""),
      billingOrganization: payment.billingOrganization || "",
      customerNamesLabel: payment.customerNamesLabel || payment.customerName || "",
      amount: toPositiveNumber(payment.amount, 0),
      date: payment.date || toInputDate(today),
      notes: payment.notes || "",
    }))
    : [];
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

function initializeCropSeedingState(cropId) {
  state.seeding[cropId] = state.seeding[cropId] || {};
  trayTypes.forEach((tray) => {
    state.seeding[cropId][tray.id] = state.seeding[cropId][tray.id] || {};
    seedingDates.forEach((date) => {
      const key = toDateKey(date);
      if (!Number.isFinite(state.seeding[cropId][tray.id][key])) {
        state.seeding[cropId][tray.id][key] = 0;
      }
    });
  });
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

function markDirty({ immediate = false } = {}) {
  isDirty = true;
  changeSequence += 1;
  if (!cloudSyncEnabled) {
    setSyncStatus(getUnavailableSyncMessage());
    return;
  }
  scheduleStateSave(immediate ? 0 : AUTO_SAVE_DELAY_MS);
}

function scheduleStateSave(delay = AUTO_SAVE_DELAY_MS) {
  if (!cloudSyncEnabled) return;
  if (autoSaveTimerId) {
    clearTimeout(autoSaveTimerId);
  }
  setSyncStatus(delay === 0 ? "Saving to Firebase..." : "Saving changes...");
  autoSaveTimerId = window.setTimeout(() => {
    autoSaveTimerId = null;
    void saveStateToFirebase();
  }, delay);
}

function getUnavailableSyncMessage() {
  if (!firebaseSettings.enabled || !hasFirebaseConfig(firebaseSettings.config)) {
    return "Firebase not configured";
  }
  return "Firebase unavailable";
}

function initializeAuthState() {
  const storedUserId = window.sessionStorage.getItem("adminPortalActiveUserId") || "";
  activeUserId = findUserById(storedUserId) ? storedUserId : "";
  updateAuthUI();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  if (!username || !password) {
    setLoginStatus("Enter username and password.", "error");
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const matchedUser = state.users.find((user) => user.username === username && user.passwordHash === passwordHash);
    if (!matchedUser) {
      setLoginStatus("Invalid username or password.", "error");
      return;
    }
    activeUserId = matchedUser.id;
    window.sessionStorage.setItem("adminPortalActiveUserId", activeUserId);
    loginForm.reset();
    closeAppView();
    updateAuthUI();
    setLoginStatus("Login successful.", "neutral");
  } catch (error) {
    setLoginStatus(String(error?.message || "Unable to verify login."), "error");
  }
}

function handleLogout() {
  activeUserId = "";
  window.sessionStorage.removeItem("adminPortalActiveUserId");
  closeAppView();
  updateAuthUI();
  setLoginStatus("You have been logged out.", "neutral");
}

function updateAuthUI() {
  const activeUser = findUserById(activeUserId);
  const isLoggedIn = Boolean(activeUser);
  loginView.classList.toggle("hidden", isLoggedIn);
  appShell.classList.toggle("hidden", !isLoggedIn);
  currentUserChip.textContent = isLoggedIn ? `Signed in: ${activeUser.username}` : "Not signed in";
}

function setLoginStatus(message, tone = "neutral") {
  if (!loginStatusElement) return;
  loginStatusElement.textContent = message;
  loginStatusElement.className = `login-status login-status--${tone}`;
}

async function ensureOtpAuthReady() {
  if (!firebaseSettings.enabled || !hasFirebaseConfig(firebaseSettings.config)) {
    throw new Error("Firebase configuration is missing.");
  }
  if (!firebaseOtpAvailable()) {
    throw new Error("Firebase Auth SDK is not loaded.");
  }

  if (!otpFirebaseApp) {
    otpFirebaseApp = window.firebase.apps.find((app) => app.name === "otp-auth")
      || window.firebase.initializeApp(firebaseSettings.config, "otp-auth");
  }
  if (!otpAuth) {
    otpAuth = window.firebase.auth(otpFirebaseApp);
    otpAuth.useDeviceLanguage();
    await otpAuth.setPersistence(window.firebase.auth.Auth.Persistence.SESSION);
    attachOtpAuthObserver();
  }
  otpAuth.settings.appVerificationDisabledForTesting = otpModeSelect.value === "test";
  return otpAuth;
}

async function ensureOtpRecaptchaVerifier() {
  await ensureOtpAuthReady();
  if (otpRecaptchaVerifier) return otpRecaptchaVerifier;

  otpRecaptchaVerifier = new window.firebase.auth.RecaptchaVerifier("otp-recaptcha-container", {
    size: "normal",
    callback: () => {
      setOtpStatus("reCAPTCHA solved. You can continue with OTP sending.", "neutral");
    },
    "expired-callback": () => {
      setOtpStatus("reCAPTCHA expired. Please solve it again before resending the OTP.", "error");
    },
  }, otpFirebaseApp);

  otpRecaptchaWidgetId = await otpRecaptchaVerifier.render();
  return otpRecaptchaVerifier;
}

function attachOtpAuthObserver() {
  if (!otpAuth || otpAuthObserverAttached) return;
  otpAuth.onAuthStateChanged((user) => {
    updateOtpAuthUserDisplay(user);
  });
  otpAuthObserverAttached = true;
}

function resetOtpVerifierState() {
  resetOtpRecaptcha();
  if (otpRecaptchaVerifier) {
    otpRecaptchaVerifier.clear();
  }
  otpRecaptchaVerifier = null;
  otpRecaptchaWidgetId = null;
  if (otpRecaptchaContainer) {
    otpRecaptchaContainer.innerHTML = "";
  }
}

function resetOtpRecaptcha() {
  if (otpRecaptchaWidgetId !== null && window.grecaptcha) {
    window.grecaptcha.reset(otpRecaptchaWidgetId);
  }
}

function updateOtpAuthUserDisplay(user) {
  if (!otpAuthUserElement) return;
  otpAuthUserElement.textContent = user
    ? `Authenticated OTP user: ${user.phoneNumber || "Unknown phone"} | UID: ${user.uid}`
    : "No OTP-authenticated user yet.";
}

function setOtpStatus(message, tone = "neutral") {
  if (!otpStatusElement) return;
  otpStatusElement.textContent = message;
  otpStatusElement.className = `otp-status otp-status--${tone}`;
}

function getOtpReadinessMessage() {
  if (!firebaseSettings.enabled || !hasFirebaseConfig(firebaseSettings.config)) {
    return "Firebase is not configured yet. OTP testing will not work until Firebase config is available.";
  }
  if (!firebaseOtpAvailable()) {
    return "Firebase Auth SDK is not loaded. Check the Firebase script tags.";
  }
  return otpModeSelect.value === "test"
    ? "Firebase OTP test app is ready in test mode. Use a configured Firebase test number."
    : "Firebase OTP test app is ready in live mode. Use an E.164 phone number and complete the reCAPTCHA challenge.";
}

function isValidOtpPhoneNumber(value) {
  return /^\+[1-9]\d{7,14}$/.test(String(value || "").trim());
}

function firebaseOtpAvailable() {
  return Boolean(window.firebase && typeof window.firebase.initializeApp === "function" && window.firebase.auth);
}

function getOtpErrorMessage(error) {
  const code = String(error?.code || "");
  const suffix = code ? ` [${code}]` : "";
  if (code.includes("auth/operation-not-allowed")) return `Phone authentication is not enabled in Firebase Authentication.${suffix}`;
  if (code.includes("auth/unauthorized-domain")) return `This domain is not authorized for Firebase phone auth. Add it in Firebase Authentication settings.${suffix}`;
  if (code.includes("auth/invalid-phone-number")) return `Firebase rejected the phone number format. Use E.164 format, for example +919876543210.${suffix}`;
  if (code.includes("auth/too-many-requests")) return `Firebase throttled OTP requests for this session or phone number. Wait and try again, or use a test phone number.${suffix}`;
  if (code.includes("auth/billing-not-enabled")) return `Phone OTP billing is not enabled for this Firebase project.${suffix}`;
  if (code.includes("auth/quota-exceeded")) return `Firebase OTP quota has been exceeded for this project.${suffix}`;
  if (code.includes("auth/captcha-check-failed")) return `reCAPTCHA validation failed. Solve it again and retry.${suffix}`;
  if (code.includes("auth/code-expired")) return `The OTP code expired. Send a new OTP and try again.${suffix}`;
  if (code.includes("auth/invalid-verification-code")) return `The OTP code is invalid. Check the code and retry.${suffix}`;
  if (code.includes("auth/missing-verification-code")) return `Enter the OTP code before verifying.${suffix}`;
  return `${String(error?.message || "OTP request failed.")}${suffix ? ` ${suffix}` : ""}`;
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
  const recentStart = addDays(today, -13);
  const priorStart = addDays(today, -27);
  const byWeekday = new Map();
  const byDay = new Map();
  const bySku = new Map();

  orders.forEach((order) => {
    const orderDate = parseOrderDate(order.date);
    const orderKey = toDateKey(orderDate);
    const isRecentWindow = orderDate >= recentStart && orderDate <= today;
    const isPriorWindow = orderDate >= priorStart && orderDate < recentStart;
    if (!isRecentWindow && !isPriorWindow) return;

    const weekday = orderDate.getDay();
    const weekdayEntry = byWeekday.get(weekday) || {
      recentDates: new Set(),
      priorDates: new Set(),
      recentSkuMap: new Map(),
      priorSkuMap: new Map(),
    };
    if (isRecentWindow) {
      weekdayEntry.recentDates.add(orderKey);
    } else {
      weekdayEntry.priorDates.add(orderKey);
    }
    (order.items || []).forEach((item) => {
      const quantity = toPositiveInteger(item.quantity, 0);
      const skuName = item.description || "Unknown SKU";
      if (isRecentWindow) {
        weekdayEntry.recentSkuMap.set(skuName, (weekdayEntry.recentSkuMap.get(skuName) || 0) + quantity);
      } else {
        weekdayEntry.priorSkuMap.set(skuName, (weekdayEntry.priorSkuMap.get(skuName) || 0) + quantity);
      }
    });
    byWeekday.set(weekday, weekdayEntry);
  });

  for (let offset = 1; offset <= 14; offset += 1) {
    const futureDate = addDays(today, offset);
    const futureKey = toDateKey(futureDate);
    const weekdayEntry = byWeekday.get(futureDate.getDay());
    if (!weekdayEntry) continue;

    const recentOccurrences = Math.max(weekdayEntry.recentDates.size, 1);
    const priorOccurrences = Math.max(weekdayEntry.priorDates.size, 1);
    const skuNames = new Set([
      ...weekdayEntry.recentSkuMap.keys(),
      ...weekdayEntry.priorSkuMap.keys(),
    ]);
    const dayEntry = { date: futureKey, totalBoxes: 0, skuMap: new Map() };

    skuNames.forEach((skuName) => {
      const recentAverage = (weekdayEntry.recentSkuMap.get(skuName) || 0) / recentOccurrences;
      const priorAverage = (weekdayEntry.priorSkuMap.get(skuName) || 0) / priorOccurrences;
      let projectedQuantity = 0;

      if (recentAverage > 0) {
        projectedQuantity = recentAverage + ((recentAverage - priorAverage) * 0.5);
      } else if (priorAverage > 0) {
        projectedQuantity = priorAverage * 0.5;
      }

      projectedQuantity = roundForecastQuantity(Math.max(projectedQuantity, 0));
      if (!projectedQuantity) return;

      dayEntry.totalBoxes += projectedQuantity;
      dayEntry.skuMap.set(skuName, projectedQuantity);
      bySku.set(skuName, roundForecastQuantity((bySku.get(skuName) || 0) + projectedQuantity));
    });

    if (dayEntry.totalBoxes > 0) {
      dayEntry.totalBoxes = roundForecastQuantity(dayEntry.totalBoxes);
      byDay.set(futureKey, dayEntry);
    }
  }

  return {
    totalBoxes: roundForecastQuantity(Array.from(byDay.values()).reduce((sum, row) => sum + row.totalBoxes, 0)),
    byDay: Array.from(byDay.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((row) => ({
        date: row.date,
        totalBoxes: row.totalBoxes,
        skuBreakdown: Array.from(row.skuMap.entries())
          .sort((left, right) => right[1] - left[1])
          .map(([skuName, quantity]) => `${skuName} (${formatNumber(quantity)})`)
          .join(", "),
      })),
    bySku: Array.from(bySku.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([skuName, quantity]) => ({ skuName, quantity: roundForecastQuantity(quantity) })),
  };
}

function buildAnticipatedHarvestDemand(orders, harvestDates) {
  const recentStart = addDays(today, -13);
  const priorStart = addDays(today, -27);
  const byWeekday = new Map();
  const cropByDate = new Map();
  const totalByDate = new Map();

  orders.forEach((order) => {
    const orderDate = parseOrderDate(order.date);
    const orderKey = toDateKey(orderDate);
    const isRecentWindow = orderDate >= recentStart && orderDate <= today;
    const isPriorWindow = orderDate >= priorStart && orderDate < recentStart;
    if (!isRecentWindow && !isPriorWindow) return;

    const weekday = orderDate.getDay();
    const weekdayEntry = byWeekday.get(weekday) || {
      recentDates: new Set(),
      priorDates: new Set(),
      recentCropMap: new Map(),
      priorCropMap: new Map(),
    };
    if (isRecentWindow) {
      weekdayEntry.recentDates.add(orderKey);
    } else {
      weekdayEntry.priorDates.add(orderKey);
    }

    (order.items || []).forEach((item) => {
      const crop = findCropForOrderItem(item);
      if (!crop) return;

      const equivalentBoxes = convertOrderItemToSixtyFiveGramBoxes(item);
      if (!equivalentBoxes) return;

      const targetMap = isRecentWindow ? weekdayEntry.recentCropMap : weekdayEntry.priorCropMap;
      targetMap.set(crop.id, (targetMap.get(crop.id) || 0) + equivalentBoxes);
    });

    byWeekday.set(weekday, weekdayEntry);
  });

  harvestDates.forEach((harvestDate) => {
    const weekdayEntry = byWeekday.get(harvestDate.getDay());
    if (!weekdayEntry) return;

    const dateKey = toDateKey(harvestDate);
    const recentOccurrences = Math.max(weekdayEntry.recentDates.size, 1);
    const priorOccurrences = Math.max(weekdayEntry.priorDates.size, 1);
    let totalProjected = 0;

    state.crops.forEach((crop) => {
      const recentAverage = (weekdayEntry.recentCropMap.get(crop.id) || 0) / recentOccurrences;
      const priorAverage = (weekdayEntry.priorCropMap.get(crop.id) || 0) / priorOccurrences;
      let projectedBoxes = 0;

      if (recentAverage > 0) {
        projectedBoxes = recentAverage + ((recentAverage - priorAverage) * 0.5);
      } else if (priorAverage > 0) {
        projectedBoxes = priorAverage * 0.5;
      }

      projectedBoxes = Math.ceil(Math.max(projectedBoxes, 0));
      if (!projectedBoxes) return;

      totalProjected += projectedBoxes;
      cropByDate.set(`${crop.id}|${dateKey}`, projectedBoxes);
    });

    if (totalProjected > 0) {
      totalByDate.set(`total|${dateKey}`, totalProjected);
    }
  });

  return { cropByDate, totalByDate };
}

function convertOrderItemToSixtyFiveGramBoxes(item) {
  const sourceName = item.description || findSkuById(item.skuId)?.name || "";
  const gramsMatch = sourceName.match(/(\d+(?:\.\d+)?)\s*g(?:m|ms)\b/i);
  const packSizeGrams = gramsMatch ? toPositiveNumber(gramsMatch[1], 65) : 65;
  const quantity = toPositiveNumber(item.quantity, 0);
  return quantity > 0 ? (quantity * packSizeGrams) / 65 : 0;
}

function findCropForOrderItem(item) {
  const sourceName = item.description || findSkuById(item.skuId)?.name || "";
  const normalizedSource = normalizeCropLookup(sourceName);
  return [...state.crops]
    .sort((left, right) => right.name.length - left.name.length)
    .find((crop) => normalizedSource.includes(normalizeCropLookup(crop.name))) || null;
}

function normalizeCropLookup(value) {
  return normalizeSkuName(value)
    .replace(/\bmicrogreens\b/g, " ")
    .replace(/\bhand-trimmed\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*g(?:m|ms)\b/g, " ")
    .replace(/\bbox\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAnticipatedBoxesForCell(targetMap, keyPrefix, date) {
  return targetMap.get(`${keyPrefix}|${toDateKey(date)}`) || 0;
}

function buildAnticipatedTrayPlan(crop, harvestDate, actualBoxes, anticipatedBoxes) {
  if (!crop || anticipatedBoxes <= 0 || actualBoxes >= anticipatedBoxes) return null;
  const seedingDate = addDays(harvestDate, -crop.harvestDays);
  const dateKey = toDateKey(seedingDate);
  const shortfallBoxes = Math.max(anticipatedBoxes - actualBoxes, 0);
  const greenTrays = Math.ceil(shortfallBoxes / Math.max(crop.greenTrayYieldBoxes, 0.01));
  const blackTrays = Math.ceil(shortfallBoxes / Math.max(getTrayYieldBoxes(crop, "black"), 0.01));
  const existingGreen = state.seeding[crop.id]?.green?.[dateKey] || 0;
  const existingBlack = state.seeding[crop.id]?.black?.[dateKey] || 0;

  let recommendedTrayId = "black";
  if (existingGreen > 0 && existingBlack === 0) {
    recommendedTrayId = "green";
  } else if (existingBlack > 0 && existingGreen === 0) {
    recommendedTrayId = "black";
  } else if (greenTrays <= blackTrays) {
    recommendedTrayId = "green";
  }

  const recommendedTrayCount = recommendedTrayId === "green" ? greenTrays : blackTrays;
  const recommendedTrayLabel = recommendedTrayId === "green" ? "green trays" : "black trays";

  return {
    cropId: crop.id,
    harvestDateKey: toDateKey(harvestDate),
    seedingDateKey: dateKey,
    shortfallBoxes,
    lines: [
      `Seed on ${formatDayMonth(seedingDate)} (${formatWeekday(seedingDate)})`,
      `Short by ${formatNumber(shortfallBoxes)} forecast 65g boxes`,
      `${greenTrays} green trays or ${blackTrays} black trays`,
      `Recommended: ${recommendedTrayCount} ${recommendedTrayLabel}`,
    ],
    recommendedTrayId,
    recommendedTrayCount,
  };
}

function shouldUnderlineAnticipatedDemand(crop, harvestDate, actualBoxes, anticipatedBoxes) {
  if (!crop || anticipatedBoxes <= 0 || actualBoxes >= anticipatedBoxes) return false;
  const seedingDate = addDays(harvestDate, -crop.harvestDays);
  return seedingDate <= addDays(today, 1);
}

function renderProjectedBoxesCell(actualBoxes, anticipatedBoxes, tooltipKey, trayPlan = null, underlineAnticipated = false) {
  const anticipatedClass = [
    "box-cell__anticipated",
    actualBoxes < anticipatedBoxes ? "box-cell__anticipated--short" : "box-cell__anticipated--covered",
    underlineAnticipated ? "box-cell__anticipated--action" : "",
  ].filter(Boolean).join(" ");
  if (!trayPlan) {
    return `<td><div class="box-cell"><strong class="box-cell__actual">${formatNumber(actualBoxes)}${anticipatedBoxes > 0 ? ` <small class="${anticipatedClass}">(${formatNumber(anticipatedBoxes)})</small>` : ""}</strong></div></td>`;
  }
  const tooltipMarkup = trayPlan.lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
  const isOpen = activeProjectedBoxTooltipKey === tooltipKey;
  return `<td><div class="box-cell box-cell--interactive ${isOpen ? "is-open" : ""}" data-box-tooltip-key="${tooltipKey}"><button class="box-cell__trigger" type="button" data-box-tooltip-key="${tooltipKey}" aria-expanded="${isOpen ? "true" : "false"}"><strong class="box-cell__actual">${formatNumber(actualBoxes)}${anticipatedBoxes > 0 ? ` <small class="${anticipatedClass}">(${formatNumber(anticipatedBoxes)})</small>` : ""}</strong></button><div class="box-cell__tooltip">${tooltipMarkup}<button class="box-cell__action" type="button" data-box-tooltip-key="${tooltipKey}" data-crop-id="${trayPlan.cropId}" data-seeding-date="${trayPlan.seedingDateKey}" data-tray-id="${trayPlan.recommendedTrayId}" data-tray-count="${trayPlan.recommendedTrayCount}">Do it!</button></div></div></td>`;
}

function handleProjectedBoxTooltipToggle(event) {
  event.stopPropagation();
  const button = event.currentTarget;
  const tooltipKey = button.dataset.boxTooltipKey || "";
  activeProjectedBoxTooltipKey = activeProjectedBoxTooltipKey === tooltipKey ? "" : tooltipKey;
  renderBoxesTable();
}

function handleProjectedBoxAction(event) {
  event.stopPropagation();
  const { cropId, seedingDate, trayId } = event.currentTarget.dataset;
  const trayCount = toPositiveInteger(event.currentTarget.dataset.trayCount, 0);
  if (!cropId || !seedingDate || !trayId || trayCount <= 0) return;

  const currentValue = state.seeding[cropId]?.[trayId]?.[seedingDate] || 0;
  state.seeding[cropId][trayId][seedingDate] = currentValue + trayCount;
  activeProjectedBoxTooltipKey = "";
  renderYield();
  markDirty({ immediate: true });
  setSyncStatus(`Added ${trayCount} ${trayId === "green" ? "green" : "black"} trays on ${formatDayMonth(parseOrderDate(seedingDate))}`);
}

function roundForecastQuantity(value) {
  return Math.round(value * 2) / 2;
}

function renderForecastDays(rows) {
  if (!analyticsForecastDaysElement) return;
  analyticsForecastDaysElement.innerHTML = rows.length
    ? rows.map((row) => `
      <div class="forecast-row">
        <strong>${escapeHtml(formatInvoiceDate(row.date))}</strong>
        <span>${escapeHtml(`${formatNumber(row.totalBoxes)} boxes`)}<br>${escapeHtml(row.skuBreakdown || "-")}</span>
      </div>
    `).join("")
    : `<div class="forecast-list__empty">No weekday demand pattern is available yet for the next two weeks.</div>`;
}

function renderForecastSkus(rows) {
  if (!analyticsForecastSkusElement) return;
  analyticsForecastSkusElement.innerHTML = rows.length
    ? rows.map((row) => `
      <div class="forecast-row">
        <strong>${escapeHtml(row.skuName)}</strong>
        <span>${escapeHtml(`${formatNumber(row.quantity)} boxes expected`)}</span>
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
    billing: normalizeBilling(customer.billing),
    chefs: Array.isArray(customer.chefs) ? customer.chefs.map((chef) => ({ ...chef })) : [],
  }));
}

function mergeCustomersByCode(existingCustomers, incomingCustomers) {
  const merged = new Map();
  existingCustomers.forEach((customer) => {
    const key = customer.customerCode || customer.id;
    if (key) merged.set(key, {
      ...customer,
      billing: normalizeBilling(customer.billing),
      chefs: Array.isArray(customer.chefs) ? customer.chefs.map((chef) => ({ ...chef })) : [],
    });
  });
  incomingCustomers.forEach((customer) => {
    const key = customer.customerCode || customer.id;
    if (key) merged.set(key, {
      ...customer,
      billing: normalizeBilling(customer.billing),
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
  const billing = normalizeBilling(customer?.billing ? { ...customer.billing } : { ...(order.billing || {}) });
  const items = Array.isArray(order.items) ? order.items.map((item) => hydrateMigratedItem(item)) : [];
  const subtotal = toPositiveNumber(order.subtotal, items.reduce((sum, item) => sum + item.amount, 0));
  const discountAmount = toPositiveNumber(order.discountAmount, 0);
  const total = toPositiveNumber(order.total, Math.max(0, subtotal - discountAmount));

  return {
    id: order.id || createId("order"),
    customerId: customer?.id || order.customerId || createId("customer"),
    customerName: customer?.customerName || order.customerName || "",
    customerCode: customer?.customerCode || order.customerCode || "",
    invoicingType: normalizeInvoicingType(order.invoicingType || customer?.invoicingType),
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

function findSkuById(skuId) {
  return state.skus.find((sku) => sku.id === skuId) || null;
}

function normalizeSkuName(name) {
  const lowered = String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return migrationSkuAliases[lowered] || lowered;
}

function getNextInvoiceNumber(customer = null) {
  const invoicingType = normalizeInvoicingType(customer?.invoicingType);
  if (invoicingType === "informal") {
    const highestInformal = state.orders.reduce((max, order) => {
      const orderType = normalizeInvoicingType(order.invoicingType);
      if (orderType !== "informal") return max;
      return Math.max(max, extractInformalInvoiceSequence(order.invoiceNumber));
    }, 0);
    return formatInformalInvoiceNumber(highestInformal + 1);
  }

  const highestFormal = state.orders.reduce((max, order) => {
    const orderType = normalizeInvoicingType(order.invoicingType);
    if (orderType !== "formal") return max;
    return Math.max(max, extractFormalInvoiceSequence(order.invoiceNumber));
  }, 0);
  return String(highestFormal + 1).padStart(4, "0");
}

function extractInvoiceSequence(invoiceNumber) {
  const invoiceValue = String(invoiceNumber || "").trim().toUpperCase();
  if (/[A-Z]/.test(invoiceValue)) {
    return extractInformalInvoiceSequence(invoiceValue);
  }
  return extractFormalInvoiceSequence(invoiceValue);
}

function extractFormalInvoiceSequence(invoiceNumber) {
  const match = String(invoiceNumber || "").match(/(\d+)(?!.*\d)/);
  return match ? parseInt(match[1], 10) : 0;
}

function extractInformalInvoiceSequence(invoiceNumber) {
  const letters = String(invoiceNumber || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (!letters) return 0;

  let value = 0;
  letters.split("").forEach((character) => {
    value = (value * 26) + (character.charCodeAt(0) - 64);
  });
  return value;
}

function formatInformalInvoiceNumber(sequence) {
  const letters = convertNumberToInvoiceLetters(Math.max(1, sequence));
  return letters.padStart(4, "0");
}

function convertNumberToInvoiceLetters(sequence) {
  let remaining = Math.max(1, sequence);
  let output = "";
  while (remaining > 0) {
    remaining -= 1;
    output = String.fromCharCode(65 + (remaining % 26)) + output;
    remaining = Math.floor(remaining / 26);
  }
  return output;
}

function normalizeInvoicingType(value) {
  return value === "informal" ? "informal" : "formal";
}

function formatInvoicingType(value) {
  return normalizeInvoicingType(value) === "informal" ? "Informal" : "Formal";
}

function parseOrderDate(value) {
  const parsed = startOfDay(new Date(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function buildSalesSummary() {
  const monthKey = toMonthKey(today);
  const currentYear = today.getFullYear();
  const grouped = new Map();

  state.orders.forEach((order) => {
    const billingOrganization = order.billing?.organization || getOrderDisplayCustomerName(order) || "Unknown Billing Organization";
    const billingOrganizationKey = normalizeBillingOrganizationKey(billingOrganization);
    const matchedCustomer = state.customers.find((customer) =>
      (order.customerId && customer.id === order.customerId)
      || (order.customerCode && customer.customerCode === order.customerCode)
    );
    const customerName = matchedCustomer?.customerName || order.customerName || billingOrganization;
    const row = grouped.get(billingOrganizationKey) || {
      billingOrganizationKey,
      billingOrganization,
      customerNames: new Set(),
      totalSale: 0,
      totalDue: 0,
      amountReceived: 0,
    };

    row.customerNames.add(customerName);
    row.totalSale += toPositiveNumber(order.total, 0);
    if (parseOrderDate(order.dueDate) <= today) {
      row.totalDue += toPositiveNumber(order.total, 0);
    }
    grouped.set(billingOrganizationKey, row);
  });

  state.payments.forEach((payment) => {
    const billingOrganizationKey = payment.billingOrganizationKey || normalizeBillingOrganizationKey(payment.billingOrganization || payment.customerNamesLabel || "");
    if (!billingOrganizationKey) return;
    const row = grouped.get(billingOrganizationKey) || {
      billingOrganizationKey,
      billingOrganization: payment.billingOrganization || payment.customerNamesLabel || "Unknown Billing Organization",
      customerNames: new Set(),
      totalSale: 0,
      totalDue: 0,
      amountReceived: 0,
    };
    if (payment.customerNamesLabel) {
      payment.customerNamesLabel.split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => row.customerNames.add(name));
    }
    row.amountReceived += toPositiveNumber(payment.amount, 0);
    grouped.set(billingOrganizationKey, row);
  });

  const customerRows = Array.from(grouped.values())
    .map((row) => ({
      ...row,
      customerNamesLabel: Array.from(row.customerNames).sort((left, right) => left.localeCompare(right)).join(", ") || row.billingOrganization,
    }))
    .sort((left, right) => right.totalSale - left.totalSale || left.customerNamesLabel.localeCompare(right.customerNamesLabel));

  return {
    mtdSales: state.orders
      .filter((order) => toMonthKey(parseOrderDate(order.date)) === monthKey)
      .reduce((sum, order) => sum + toPositiveNumber(order.total, 0), 0),
    ytdSales: state.orders
      .filter((order) => parseOrderDate(order.date).getFullYear() === currentYear)
      .reduce((sum, order) => sum + toPositiveNumber(order.total, 0), 0),
    rows: customerRows,
  };
}

function buildLedgerSummary(billingOrganizationKey) {
  const salesRow = buildSalesSummary().rows.find((row) => row.billingOrganizationKey === billingOrganizationKey);
  if (!salesRow) return null;

  const entries = [];
  state.orders
    .filter((order) => normalizeBillingOrganizationKey(order.billing?.organization || getOrderDisplayCustomerName(order) || "") === billingOrganizationKey)
    .forEach((order) => {
      entries.push({
        type: "Invoice",
        date: order.date,
        reference: order.invoiceNumber || order.id,
        note: (order.items || []).map((item) => item.description).join(", "),
        dueDate: order.dueDate || "",
        debit: toPositiveNumber(order.total, 0),
        credit: 0,
      });
    });

  state.payments
    .filter((payment) => (payment.billingOrganizationKey || normalizeBillingOrganizationKey(payment.billingOrganization || payment.customerNamesLabel || "")) === billingOrganizationKey)
    .forEach((payment) => {
      entries.push({
        type: "Receipt",
        date: payment.date || toInputDate(today),
        reference: payment.id,
        note: payment.notes || "Payment received",
        dueDate: "",
        debit: 0,
        credit: toPositiveNumber(payment.amount, 0),
      });
    });

  entries.sort((left, right) => {
    const dateDifference = parseOrderDate(left.date) - parseOrderDate(right.date);
    if (dateDifference !== 0) return dateDifference;
    return left.type === right.type ? 0 : (left.type === "Invoice" ? -1 : 1);
  });

  let runningBalance = 0;
  const rows = entries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return {
      ...entry,
      balance: runningBalance,
    };
  });

  return {
    ...salesRow,
    customerGst: getLedgerCustomerGst(billingOrganizationKey),
    entries: rows,
    totalInvoiced: rows.reduce((sum, entry) => sum + entry.debit, 0),
    totalReceived: rows.reduce((sum, entry) => sum + entry.credit, 0),
    outstanding: Math.max(0, runningBalance),
  };
}

function getLedgerCustomerGst(billingOrganizationKey) {
  const matchingOrder = [...state.orders]
    .reverse()
    .find((order) => normalizeBillingOrganizationKey(order.billing?.organization || getOrderDisplayCustomerName(order) || "") === billingOrganizationKey);
  if (matchingOrder?.billing?.gst) return matchingOrder.billing.gst;

  const matchingCustomer = state.customers.find((customer) =>
    normalizeBillingOrganizationKey(customer.billing?.organization || customer.customerName || "") === billingOrganizationKey
  );
  return matchingCustomer?.billing?.gst || "-";
}

function renderLedgerReport(billingOrganizationKey) {
  handleDownloadLedger(billingOrganizationKey);
}

function refreshLedgerReport() {
  return;
}

function buildLedgerMarkup(ledger) {
  return `
    <div class="ledger-sheet">
      <div class="ledger-header">
        <div class="ledger-brand">
          <img src="${companyDetails.logoPath}" alt="Leaf Over Logic logo" class="invoice-logo">
          <div>
            <h3>${escapeHtml(companyDetails.name)}</h3>
            ${companyDetails.address.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
            <div>GSTIN/UIN: ${escapeHtml(companyDetails.gst || "-")}</div>
            <div>Phone: ${escapeHtml(companyDetails.phone)}</div>
          </div>
        </div>
        <div class="ledger-meta">
          <h3>Customer Ledger</h3>
          <div>Generated: ${formatInvoiceDate(toInputDate(today))}</div>
          <div>Customer: ${escapeHtml(ledger.customerNamesLabel)}</div>
          <div>Organization: ${escapeHtml(ledger.billingOrganization)}</div>
          <div>Customer GSTIN/UIN: ${escapeHtml(ledger.customerGst || "-")}</div>
        </div>
      </div>
      <div class="ledger-summary-grid">
        <div class="ledger-summary-card">
          <span>Total Invoiced</span>
          <strong>${formatCurrency(ledger.totalInvoiced)}</strong>
        </div>
        <div class="ledger-summary-card">
          <span>Total Received</span>
          <strong>${formatCurrency(ledger.totalReceived)}</strong>
        </div>
        <div class="ledger-summary-card">
          <span>Outstanding</span>
          <strong>${formatCurrency(ledger.outstanding)}</strong>
        </div>
      </div>
      <table class="invoice-table ledger-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Reference</th>
            <th>Details</th>
            <th>Due Date</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${ledger.entries.length ? ledger.entries.map((entry) => `
            <tr>
              <td>${formatInvoiceDate(entry.date)}</td>
              <td>${escapeHtml(entry.type)}</td>
              <td>${escapeHtml(entry.reference || "-")}</td>
              <td>${escapeHtml(entry.note || "-")}</td>
              <td>${entry.dueDate ? formatInvoiceDate(entry.dueDate) : "-"}</td>
              <td>${entry.debit ? formatCurrency(entry.debit) : "-"}</td>
              <td>${entry.credit ? formatCurrency(entry.credit) : "-"}</td>
              <td>${formatCurrency(entry.balance)}</td>
            </tr>
          `).join("") : `
            <tr>
              <td colspan="8">No ledger activity available for this customer.</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function handleDownloadLedger(billingOrganizationKey = currentLedgerBillingOrganizationKey) {
  const ledger = buildLedgerSummary(billingOrganizationKey);
  if (!ledger) {
    setSyncStatus("Download a ledger from the customer sales table");
    return;
  }
  currentLedgerBillingOrganizationKey = billingOrganizationKey;
  const printWindow = window.open("", "_blank", "width=1280,height=900");
  const stylesheetUrl = new URL("styles.css", window.location.href).href;
  const printMarkup = `
    <html>
      <head>
        <title>Customer Ledger</title>
        <base href="${window.location.href}">
        <link rel="stylesheet" href="${stylesheetUrl}">
      </head>
      <body class="print-window">
        ${buildLedgerMarkup(ledger)}
      </body>
    </html>
  `;
  printWindow.document.write(printMarkup);
  printWindow.document.close();
  printWindow.addEventListener("load", () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }, { once: true });
}

function normalizeBillingOrganizationKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findTitleById(titleId) {
  return state.titles.find((title) => title.id === titleId) || null;
}

function findUserById(userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function getUserFullName(user) {
  return [user?.firstName || "", user?.lastName || ""].join(" ").trim() || "Unnamed User";
}

async function hashPassword(value) {
  const normalized = String(value || "");
  if (!window.crypto?.subtle || !window.TextEncoder) {
    throw new Error("Secure password hashing is not supported in this browser.");
  }
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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
  if (!state.crops.length) return [];
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
  const cropSeeding = state.seeding[crop.id] || { green: {}, black: {} };
  return (cropSeeding.green[key] || 0) * getTrayYieldBoxes(crop, "green") + (cropSeeding.black[key] || 0) * getTrayYieldBoxes(crop, "black");
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

function showSaveFeedback(element, message = "Save successful") {
  if (!element) return;
  const existingTimer = saveFeedbackTimers.get(element);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  element.textContent = message;
  element.classList.add("is-visible");
  const timerId = window.setTimeout(() => {
    element.classList.remove("is-visible");
    element.textContent = "";
    saveFeedbackTimers.delete(element);
  }, 2200);
  saveFeedbackTimers.set(element, timerId);
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
