// Global variables
let sidebarCollapsed = false
let actionsOpen = true
const demands = [
  {
    id: 1,
    bank: "AWA Bank",
    entity: "Commercial",
    type: "Crédit",
    counterpart: "Client A",
    date: "2024-01-15",
    time: "14:30",
    status: "Niveau 1 - Validation locale",
    level: 1,
  },
  {
    id: 2,
    bank: "AIG Bank",
    entity: "Retail",
    type: "Garantie",
    counterpart: "Client B",
    date: "2024-01-14",
    time: "09:15",
    status: "Niveau 2 - Validation AWA",
    level: 2,
  },
  {
    id: 3,
    bank: "AWA Bank",
    entity: "Corporate",
    type: "Financement",
    counterpart: "Client C",
    date: "2024-01-13",
    time: "16:45",
    status: "Niveau 3 - Validation GGR Group",
    level: 3,
  },
  {
    id: 4,
    bank: "AIG Bank",
    entity: "Commercial",
    type: "Crédit Export",
    counterpart: "Client D",
    date: "2024-01-12",
    time: "11:20",
    status: "Validé - Approuvé",
    level: 4,
  },
  {
    id: 5,
    bank: "AWA Bank",
    entity: "Retail",
    type: "Découvert",
    counterpart: "Client E",
    date: "2024-01-11",
    time: "08:30",
    status: "Rejeté",
    level: 0,
  },
  {
    id: 6,
    bank: "AIG Bank",
    entity: "Corporate",
    type: "Ligne de crédit",
    counterpart: "Client F",
    date: "2024-01-10",
    time: "15:45",
    status: "En attente - Niveau 1",
    level: 1,
  },
]

// DOM Elements
const sidebar = document.getElementById("sidebar")
const mainContent = document.getElementById("mainContent")
const mobileOverlay = document.getElementById("mobileOverlay")
const sidebarToggle = document.getElementById("sidebarToggle")
const sidebarClose = document.getElementById("sidebarClose")
const mobileMenuToggle = document.getElementById("mobileMenuToggle")
const actionsToggle = document.getElementById("actionsToggle")
const actionsSubmenu = document.getElementById("actionsSubmenu")
const actionsIcon = document.getElementById("actionsIcon")
const toggleIcon = document.getElementById("toggleIcon")
const actionsSection = document.getElementById("actionsSection")
const collapsedActions = document.getElementById("collapsedActions")

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  populateTable(demands)
  setupFilters()
})

// Event Listeners
function initializeEventListeners() {
  // Mobile menu toggle
  mobileMenuToggle.addEventListener("click", () => {
    sidebar.classList.add("show")
    mobileOverlay.classList.add("show")
  })

  // Sidebar close (mobile)
  sidebarClose.addEventListener("click", () => {
    sidebar.classList.remove("show")
    mobileOverlay.classList.remove("show")
  })

  // Mobile overlay click
  mobileOverlay.addEventListener("click", () => {
    sidebar.classList.remove("show")
    mobileOverlay.classList.remove("show")
  })

  // Sidebar toggle (desktop)
  sidebarToggle.addEventListener("click", () => {
    toggleSidebarCollapse()
  })

  // Actions menu toggle
  actionsToggle.addEventListener("click", () => {
    toggleActionsMenu()
  })
}

// Toggle sidebar collapse
function toggleSidebarCollapse() {
  sidebarCollapsed = !sidebarCollapsed

  if (sidebarCollapsed) {
    sidebar.classList.add("collapsed")
    mainContent.classList.add("collapsed")
    toggleIcon.className = "bi bi-chevron-right"
    actionsOpen = false
    actionsSubmenu.classList.add("collapsed")
    actionsIcon.className = "bi bi-chevron-right"
  } else {
    sidebar.classList.remove("collapsed")
    mainContent.classList.remove("collapsed")
    toggleIcon.className = "bi bi-chevron-down"
    actionsOpen = true
    actionsSubmenu.classList.remove("collapsed")
    actionsIcon.className = "bi bi-chevron-down"
  }
}

// Toggle actions menu
function toggleActionsMenu() {
  if (sidebarCollapsed) return

  actionsOpen = !actionsOpen

  if (actionsOpen) {
    actionsSubmenu.classList.remove("collapsed")
    actionsIcon.className = "bi bi-chevron-down"
  } else {
    actionsSubmenu.classList.add("collapsed")
    actionsIcon.className = "bi bi-chevron-right"
  }
}

// Get validation level class
function getValidationLevelClass(level) {
  switch (level) {
    case 0:
      return "level-rejected"
    case 1:
      return "level-1"
    case 2:
      return "level-2"
    case 3:
      return "level-3"
    case 4:
      return "level-approved"
    default:
      return "bg-secondary"
  }
}

// Populate table with demands
function populateTable(demandsData) {
  const tableBody = document.getElementById("demandsTableBody")
  tableBody.innerHTML = ""

  demandsData.forEach((demand) => {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td class="fw-medium">${demand.bank}</td>
            <td>${demand.entity}</td>
            <td>${demand.type}</td>
            <td>${demand.counterpart}</td>
            <td class="text-nowrap">${demand.date} | ${demand.time}</td>
            <td>
                <span class="badge ${getValidationLevelClass(demand.level)}">${demand.status}</span>
            </td>
            <td>
                <div class="d-flex flex-column flex-sm-row gap-1">
                    <button class="btn btn-orange btn-sm">Détails</button>
                    <button class="btn btn-red-outline btn-sm">CHAT</button>
                </div>
            </td>
        `
    tableBody.appendChild(row)
  })
}

// Setup filters
function setupFilters() {
  const filterBank = document.getElementById("filterBank")
  const filterEntity = document.getElementById("filterEntity")
  const filterType = document.getElementById("filterType")
  const filterCounterpart = document.getElementById("filterCounterpart")
  const filterDate = document.getElementById("filterDate")

  const filters = [filterBank, filterEntity, filterType, filterCounterpart, filterDate]

  filters.forEach((filter) => {
    filter.addEventListener("input", () => {
      filterTable()
    })
  })
}

// Filter table
function filterTable() {
  const filterBank = document.getElementById("filterBank").value.toLowerCase()
  const filterEntity = document.getElementById("filterEntity").value.toLowerCase()
  const filterType = document.getElementById("filterType").value.toLowerCase()
  const filterCounterpart = document.getElementById("filterCounterpart").value.toLowerCase()
  const filterDate = document.getElementById("filterDate").value.toLowerCase()

  const filteredDemands = demands.filter((demand) => {
    return (
      demand.bank.toLowerCase().includes(filterBank) &&
      demand.entity.toLowerCase().includes(filterEntity) &&
      demand.type.toLowerCase().includes(filterType) &&
      demand.counterpart.toLowerCase().includes(filterCounterpart) &&
      demand.date.toLowerCase().includes(filterDate)
    )
  })

  populateTable(filteredDemands)
}

// Handle window resize
window.addEventListener("resize", () => {
  if (window.innerWidth >= 992) {
    sidebar.classList.remove("show")
    mobileOverlay.classList.remove("show")
  }
})
