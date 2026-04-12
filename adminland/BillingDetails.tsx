"use client";
import { useState } from "react";
import {
  Search,
  Plus,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Building2,
  RefreshCw,
  FileText,
  IndianRupee,
  Users,
  Eye,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type BillingType = "Retainer" | "One-Time";
type ServiceType = "Performance Marketing" | "Accounts & Taxation";
type PaymentStatus = "Paid" | "Pending" | "Overdue";

interface BillingAccount {
  id: string;
  serviceType: ServiceType;
  billingType: BillingType;
  amount: number;
  paymentStatus: PaymentStatus;
  nextBillingDate: string;
  contractStart: string;
  contractEnd: string;
  accountManager: string;
  outstandingAmount: number;
}

interface Business {
  id: string;
  name: string;
  accounts: BillingAccount[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  businesses: Business[];
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const MOCK_CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Rajesh Kumar",
    email: "rajesh@techsolutions.in",
    businesses: [
      {
        id: "b1",
        name: "Tech Solutions Pvt Ltd",
        accounts: [
          {
            id: "a1",
            serviceType: "Performance Marketing",
            billingType: "Retainer",
            amount: 75000,
            paymentStatus: "Paid",
            nextBillingDate: "2026-05-01",
            contractStart: "2025-08-01",
            contractEnd: "2026-08-01",
            accountManager: "Zeel M.",
            outstandingAmount: 0,
          },
          {
            id: "a2",
            serviceType: "Accounts & Taxation",
            billingType: "Retainer",
            amount: 40000,
            paymentStatus: "Pending",
            nextBillingDate: "2026-04-15",
            contractStart: "2025-10-01",
            contractEnd: "2026-10-01",
            accountManager: "Zubear S.",
            outstandingAmount: 40000,
          },
        ],
      },
      {
        id: "b2",
        name: "Tech Solutions LLP",
        accounts: [
          {
            id: "a3",
            serviceType: "Accounts & Taxation",
            billingType: "One-Time",
            amount: 25000,
            paymentStatus: "Paid",
            nextBillingDate: "",
            contractStart: "2026-01-10",
            contractEnd: "2026-03-10",
            accountManager: "Zubear S.",
            outstandingAmount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "c2",
    name: "Sunita Verma",
    email: "sunita@edutech.co.in",
    businesses: [
      {
        id: "b3",
        name: "EduTech Innovations",
        accounts: [
          {
            id: "a4",
            serviceType: "Performance Marketing",
            billingType: "Retainer",
            amount: 120000,
            paymentStatus: "Overdue",
            nextBillingDate: "2026-04-05",
            contractStart: "2025-06-01",
            contractEnd: "2026-12-01",
            accountManager: "Zeel M.",
            outstandingAmount: 120000,
          },
        ],
      },
      {
        id: "b4",
        name: "EduTech Foundation",
        accounts: [
          {
            id: "a5",
            serviceType: "Accounts & Taxation",
            billingType: "Retainer",
            amount: 35000,
            paymentStatus: "Paid",
            nextBillingDate: "2026-04-20",
            contractStart: "2025-11-01",
            contractEnd: "2026-11-01",
            accountManager: "Irshad O.",
            outstandingAmount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "c3",
    name: "Vikram Patel",
    email: "vikram@greenenergy.in",
    businesses: [
      {
        id: "b5",
        name: "GreenEnergy Corp",
        accounts: [
          {
            id: "a6",
            serviceType: "Accounts & Taxation",
            billingType: "Retainer",
            amount: 60000,
            paymentStatus: "Paid",
            nextBillingDate: "2026-04-30",
            contractStart: "2025-07-01",
            contractEnd: "2026-07-01",
            accountManager: "Irshad O.",
            outstandingAmount: 0,
          },
          {
            id: "a7",
            serviceType: "Performance Marketing",
            billingType: "Retainer",
            amount: 90000,
            paymentStatus: "Pending",
            nextBillingDate: "2026-04-10",
            contractStart: "2026-01-01",
            contractEnd: "2027-01-01",
            accountManager: "Hooshang B.",
            outstandingAmount: 90000,
          },
        ],
      },
      {
        id: "b6",
        name: "GreenEnergy Solar LLP",
        accounts: [
          {
            id: "a8",
            serviceType: "Performance Marketing",
            billingType: "One-Time",
            amount: 50000,
            paymentStatus: "Paid",
            nextBillingDate: "",
            contractStart: "2026-02-01",
            contractEnd: "2026-04-01",
            accountManager: "Hooshang B.",
            outstandingAmount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "c4",
    name: "Meera Nair",
    email: "meera@fashionforward.in",
    businesses: [
      {
        id: "b7",
        name: "Fashion Forward Pvt Ltd",
        accounts: [
          {
            id: "a9",
            serviceType: "Performance Marketing",
            billingType: "One-Time",
            amount: 95000,
            paymentStatus: "Pending",
            nextBillingDate: "2026-04-10",
            contractStart: "2026-01-15",
            contractEnd: "2026-04-15",
            accountManager: "Zeel M.",
            outstandingAmount: 95000,
          },
        ],
      },
    ],
  },
  {
    id: "c5",
    name: "Karthik Iyer",
    email: "karthik@fintechsol.com",
    businesses: [
      {
        id: "b8",
        name: "FinTech Solutions Ltd",
        accounts: [
          {
            id: "a10",
            serviceType: "Performance Marketing",
            billingType: "Retainer",
            amount: 150000,
            paymentStatus: "Paid",
            nextBillingDate: "2026-05-01",
            contractStart: "2025-09-01",
            contractEnd: "2027-09-01",
            accountManager: "Hooshang B.",
            outstandingAmount: 0,
          },
        ],
      },
      {
        id: "b9",
        name: "FinTech Capital",
        accounts: [
          {
            id: "a11",
            serviceType: "Accounts & Taxation",
            billingType: "Retainer",
            amount: 55000,
            paymentStatus: "Paid",
            nextBillingDate: "2026-04-25",
            contractStart: "2025-12-01",
            contractEnd: "2026-12-01",
            accountManager: "Zubear S.",
            outstandingAmount: 0,
          },
          {
            id: "a12",
            serviceType: "Performance Marketing",
            billingType: "One-Time",
            amount: 80000,
            paymentStatus: "Overdue",
            nextBillingDate: "2026-03-20",
            contractStart: "2026-02-01",
            contractEnd: "2026-05-01",
            accountManager: "Zeel M.",
            outstandingAmount: 80000,
          },
        ],
      },
    ],
  },
  {
    id: "c6",
    name: "Anil Mehta",
    email: "anil@healthcareplus.in",
    businesses: [
      {
        id: "b10",
        name: "HealthCare Plus",
        accounts: [
          {
            id: "a13",
            serviceType: "Accounts & Taxation",
            billingType: "One-Time",
            amount: 45000,
            paymentStatus: "Pending",
            nextBillingDate: "2026-04-25",
            contractStart: "2026-01-10",
            contractEnd: "2026-03-10",
            accountManager: "Irshad O.",
            outstandingAmount: 45000,
          },
        ],
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getAllAccounts(
  clients: Client[]
): (BillingAccount & { clientName: string; businessName: string })[] {
  return clients.flatMap((c) =>
    c.businesses.flatMap((b) =>
      b.accounts.map((a) => ({
        ...a,
        clientName: c.name,
        businessName: b.name,
      }))
    )
  );
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusStyle = (s: PaymentStatus) => {
  switch (s) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700";
    case "Pending":
      return "bg-amber-50 text-amber-600";
    case "Overdue":
      return "bg-red-50 text-red-600";
  }
};

const statusIcon = (s: PaymentStatus) => {
  switch (s) {
    case "Paid":
      return <CheckCircle2 className="w-3 h-3" />;
    case "Pending":
      return <Clock className="w-3 h-3" />;
    case "Overdue":
      return <AlertCircle className="w-3 h-3" />;
  }
};

const serviceColor = (s: ServiceType) =>
  s === "Performance Marketing"
    ? { dot: "bg-[#7C3AED]", bg: "bg-[#7C3AED]/10 text-[#7C3AED]" }
    : { dot: "bg-[#06B6D4]", bg: "bg-[#06B6D4]/10 text-[#06B6D4]" };

// ── Component ──────────────────────────────────────────────────────────────────

export function BillingDetails() {
  const [clients] = useState<Client[]>(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterService, setFilterService] = useState<ServiceType | "all">(
    "all"
  );
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">(
    "all"
  );
  const [filterBilling, setFilterBilling] = useState<BillingType | "all">(
    "all"
  );
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    new Set()
  );
  const [expandedBusinesses, setExpandedBusinesses] = useState<Set<string>>(
    new Set()
  );
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  // ── Filtering ──
  const matchesAccount = (a: BillingAccount) => {
    if (filterService !== "all" && a.serviceType !== filterService)
      return false;
    if (filterStatus !== "all" && a.paymentStatus !== filterStatus)
      return false;
    if (filterBilling !== "all" && a.billingType !== filterBilling)
      return false;
    return true;
  };

  const filteredClients = clients.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(q);
      const bizMatch = c.businesses.some((b) =>
        b.name.toLowerCase().includes(q)
      );
      if (!nameMatch && !bizMatch) return false;
    }
    return c.businesses.some((b) => b.accounts.some(matchesAccount));
  });

  // ── Stats ──
  const allAccounts = getAllAccounts(clients);
  const totalClients = clients.length;
  const totalBusinesses = clients.reduce((s, c) => s + c.businesses.length, 0);
  const totalAccounts = allAccounts.length;
  const mrr = allAccounts
    .filter((a) => a.billingType === "Retainer")
    .reduce((s, a) => s + a.amount, 0);
  const pendingAmount = allAccounts
    .filter(
      (a) => a.paymentStatus === "Pending" || a.paymentStatus === "Overdue"
    )
    .reduce((s, a) => s + a.outstandingAmount, 0);
  const overdueCount = allAccounts.filter(
    (a) => a.paymentStatus === "Overdue"
  ).length;

  // ── Expand/collapse ──
  const toggleClient = (id: string) => {
    setExpandedClients((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleBusiness = (id: string) => {
    setExpandedBusinesses((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const activeFilterCount = [filterService, filterStatus, filterBilling].filter(
    (v) => v !== "all"
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-black/90">Billing</h1>
          <p className="text-black/50 text-body mt-1">
            Manage clients, businesses, and billing accounts
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#204CC7] text-white rounded-xl text-body font-medium hover:bg-[#1a3da0] transition-all">
          <Plus className="w-4 h-4" />
          Add Billing
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-4">
        {[
          {
            label: "Total Clients",
            value: totalClients,
            sub: "Active clients",
            icon: <Users className="w-4 h-4 text-black/20" />,
            color: "text-black/90",
          },
          {
            label: "Businesses",
            value: totalBusinesses,
            sub: "Across all clients",
            icon: <Building2 className="w-4 h-4 text-black/20" />,
            color: "text-black/90",
          },
          {
            label: "Billing Accounts",
            value: totalAccounts,
            sub: "PM & A&T combined",
            icon: <FileText className="w-4 h-4 text-black/20" />,
            color: "text-black/90",
          },
          {
            label: "Monthly Recurring",
            value: formatCurrency(mrr),
            sub: "From retainers",
            icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
            color: "text-emerald-600",
          },
          {
            label: "Pending Amount",
            value: formatCurrency(pendingAmount),
            sub: "Outstanding",
            icon: <Clock className="w-4 h-4 text-amber-400" />,
            color: "text-amber-600",
          },
          {
            label: "Overdue",
            value: overdueCount,
            sub: "Requires follow-up",
            icon: <AlertCircle className="w-4 h-4 text-red-400" />,
            color: "text-red-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-black/[0.06] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-black/50 text-caption">{s.label}</span>
              {s.icon}
            </div>
            <div className={`text-h2 font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-caption text-black/30 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" />
          <input
            type="text"
            placeholder="Search clients or businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-black/10 rounded-xl text-body text-black placeholder-black/40 focus:outline-none focus:border-[#204CC7] focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-black/40" />
            </button>
          )}
        </div>

        <select
          value={filterService}
          onChange={(e) =>
            setFilterService(e.target.value as ServiceType | "all")
          }
          className="px-3 py-2.5 bg-white border border-black/10 rounded-xl text-body text-black/70 focus:outline-none focus:border-[#204CC7] transition-all appearance-none cursor-pointer pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="all">All Services</option>
          <option value="Performance Marketing">Performance Marketing</option>
          <option value="Accounts & Taxation">Accounts & Taxation</option>
        </select>

        <select
          value={filterBilling}
          onChange={(e) =>
            setFilterBilling(e.target.value as BillingType | "all")
          }
          className="px-3 py-2.5 bg-white border border-black/10 rounded-xl text-body text-black/70 focus:outline-none focus:border-[#204CC7] transition-all appearance-none cursor-pointer pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="all">All Types</option>
          <option value="Retainer">Retainer</option>
          <option value="One-Time">One-Time</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as PaymentStatus | "all")
          }
          className="px-3 py-2.5 bg-white border border-black/10 rounded-xl text-body text-black/70 focus:outline-none focus:border-[#204CC7] transition-all appearance-none cursor-pointer pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>

        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setFilterService("all");
              setFilterBilling("all");
              setFilterStatus("all");
            }}
            className="text-caption font-medium text-[#204CC7] hover:text-[#1a3d9f] transition-all"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Client List */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-black/10 mx-auto mb-2" />
            <p className="text-black/50 text-body">
              No clients match your search
            </p>
            <p className="text-black/30 text-caption mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div>
            {filteredClients.map((client, ci) => {
              const isExpanded = expandedClients.has(client.id);
              const clientAccounts = client.businesses.flatMap(
                (b) => b.accounts
              );
              const clientTotal = clientAccounts.reduce(
                (s, a) => s + a.amount,
                0
              );
              const clientOutstanding = clientAccounts.reduce(
                (s, a) => s + a.outstandingAmount,
                0
              );
              const hasOverdue = clientAccounts.some(
                (a) => a.paymentStatus === "Overdue"
              );
              const hasPending = clientAccounts.some(
                (a) => a.paymentStatus === "Pending"
              );

              return (
                <div
                  key={client.id}
                  className={ci > 0 ? "border-t border-black/[0.06]" : ""}
                >
                  {/* Client Row */}
                  <div
                    onClick={() => toggleClient(client.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-black/[0.015] transition-all text-left cursor-pointer"
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 text-black/30" />
                    </div>

                    <div className="w-9 h-9 bg-[#204CC7]/[0.07] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#204CC7] text-caption font-semibold">
                        {client.name.charAt(0)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-semibold text-black">
                          {client.name}
                        </span>
                        <span className="text-caption text-black/30">
                          {client.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-caption text-black/45">
                          {client.businesses.length} business
                          {client.businesses.length !== 1 ? "es" : ""}
                        </span>
                        <span className="text-black/10">·</span>
                        <span className="text-caption text-black/45">
                          {clientAccounts.length} account
                          {clientAccounts.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      {hasOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}

                      {hasPending && !hasOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[11px] font-semibold">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}

                      {clientOutstanding > 0 && (
                        <div className="text-right">
                          <p className="text-caption text-black/40">
                            Outstanding
                          </p>
                          <p className="text-body font-semibold text-red-600">
                            {formatCurrency(clientOutstanding)}
                          </p>
                        </div>
                      )}

                      <div className="text-right">
                        <p className="text-caption text-black/40">
                          Total billing
                        </p>
                        <p className="text-body font-semibold text-black/80">
                          {formatCurrency(clientTotal)}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 🔥 CRITICAL
                          setDetailClient(client);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-black/30" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Business list */}
                  {isExpanded && (
                    <div className="pb-2">
                      {client.businesses.map((biz) => {
                        const filteredAccounts =
                          biz.accounts.filter(matchesAccount);
                        if (filteredAccounts.length === 0) return null;
                        const bizExpanded = expandedBusinesses.has(biz.id);

                        return (
                          <div key={biz.id} className="mx-5 mb-2">
                            {/* Business header */}
                            <button
                              onClick={() => toggleBusiness(biz.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-black/[0.02] hover:bg-black/[0.04] rounded-xl transition-all text-left"
                            >
                              <div
                                className={`transition-transform ${
                                  bizExpanded ? "rotate-90" : ""
                                }`}
                              >
                                <ChevronRight className="w-3.5 h-3.5 text-black/30" />
                              </div>
                              <Building2 className="w-4 h-4 text-black/30" />
                              <span className="text-body font-medium text-black/80">
                                {biz.name}
                              </span>
                              <span className="text-caption text-black/35 ml-1">
                                {filteredAccounts.length} account
                                {filteredAccounts.length !== 1 ? "s" : ""}
                              </span>
                              <div className="flex-1" />
                              <div className="flex items-center gap-1.5">
                                {filteredAccounts.map((a) => (
                                  <div
                                    key={a.id}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      serviceColor(a.serviceType).dot
                                    }`}
                                    title={a.serviceType}
                                  />
                                ))}
                              </div>
                            </button>

                            {/* Account cards */}
                            {bizExpanded && (
                              <div className="mt-2 space-y-2 pl-8">
                                {filteredAccounts.map((acc) => {
                                  const sc = serviceColor(acc.serviceType);
                                  return (
                                    <div
                                      key={acc.id}
                                      className="flex items-center gap-4 px-4 py-3 bg-white border border-black/[0.06] rounded-xl"
                                    >
                                      {/* Service badge */}
                                      <div
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg}`}
                                      >
                                        <div
                                          className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                                        />
                                        {acc.serviceType ===
                                        "Performance Marketing"
                                          ? "PM"
                                          : "A&T"}
                                      </div>

                                      {/* Billing type */}
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${
                                          acc.billingType === "Retainer"
                                            ? "bg-[#204CC7]/[0.07] text-[#204CC7]"
                                            : "bg-black/[0.04] text-black/50"
                                        }`}
                                      >
                                        {acc.billingType === "Retainer" ? (
                                          <RefreshCw className="w-3 h-3" />
                                        ) : (
                                          <FileText className="w-3 h-3" />
                                        )}
                                        {acc.billingType}
                                      </span>

                                      {/* Amount */}
                                      <div className="flex items-center gap-1">
                                        <IndianRupee className="w-3 h-3 text-black/30" />
                                        <span className="text-body font-semibold text-black/80">
                                          {formatCurrency(acc.amount)}
                                        </span>
                                        {acc.billingType === "Retainer" && (
                                          <span className="text-caption text-black/30">
                                            /mo
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex-1" />

                                      {/* Next billing */}
                                      {acc.nextBillingDate && (
                                        <div className="flex items-center gap-1.5 text-caption text-black/45">
                                          <Calendar className="w-3 h-3" />
                                          {formatDate(acc.nextBillingDate)}
                                        </div>
                                      )}

                                      {/* Manager */}
                                      <span className="text-caption text-black/45">
                                        {acc.accountManager}
                                      </span>

                                      {/* Status */}
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusStyle(
                                          acc.paymentStatus
                                        )}`}
                                      >
                                        {statusIcon(acc.paymentStatus)}
                                        {acc.paymentStatus}
                                      </span>

                                      {/* Outstanding */}
                                      {acc.outstandingAmount > 0 && (
                                        <span className="text-caption font-semibold text-red-600">
                                          {formatCurrency(
                                            acc.outstandingAmount
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Detail Drawer */}
      {detailClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setDetailClient(null)}
          />
          <div
            className="relative w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto"
            style={{ animation: "slideIn 0.2s ease-out" }}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-black/[0.06] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-h2 font-semibold text-black">
                Client Overview
              </h2>
              <button
                onClick={() => setDetailClient(null)}
                className="w-8 h-8 rounded-lg border border-black/10 hover:bg-black/5 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Client Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#204CC7]/[0.07] rounded-xl flex items-center justify-center">
                  <span className="text-[#204CC7] text-h2 font-semibold">
                    {detailClient.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-h3 font-semibold text-black">
                    {detailClient.name}
                  </h3>
                  <p className="text-body text-black/45 mt-0.5">
                    {detailClient.email}
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              {(() => {
                const allAcc = detailClient.businesses.flatMap(
                  (b) => b.accounts
                );
                const totalBilling = allAcc.reduce((s, a) => s + a.amount, 0);
                const totalOut = allAcc.reduce(
                  (s, a) => s + a.outstandingAmount,
                  0
                );
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#F6F7FF] rounded-xl p-3 text-center">
                      <p className="text-caption text-black/45">Businesses</p>
                      <p className="text-h3 font-semibold text-black mt-1">
                        {detailClient.businesses.length}
                      </p>
                    </div>
                    <div className="bg-[#F6F7FF] rounded-xl p-3 text-center">
                      <p className="text-caption text-black/45">
                        Total Billing
                      </p>
                      <p className="text-h3 font-semibold text-black mt-1">
                        {formatCurrency(totalBilling)}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl p-3 text-center ${
                        totalOut > 0 ? "bg-red-50" : "bg-emerald-50"
                      }`}
                    >
                      <p className="text-caption text-black/45">Outstanding</p>
                      <p
                        className={`text-h3 font-semibold mt-1 ${
                          totalOut > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {totalOut > 0 ? formatCurrency(totalOut) : "₹0"}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Businesses + Accounts */}
              {detailClient.businesses.map((biz) => (
                <div key={biz.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-black/35" />
                    <h4 className="text-body font-semibold text-black">
                      {biz.name}
                    </h4>
                    <span className="text-caption text-black/30">
                      {biz.accounts.length} account
                      {biz.accounts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {biz.accounts.map((acc) => {
                      const sc = serviceColor(acc.serviceType);
                      return (
                        <div
                          key={acc.id}
                          className="bg-[#F6F7FF] rounded-xl p-4 space-y-3"
                        >
                          {/* Service + Type + Status row */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sc.bg}`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                              />
                              {acc.serviceType}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-lg text-[11px] font-medium ${
                                acc.billingType === "Retainer"
                                  ? "bg-[#204CC7]/[0.07] text-[#204CC7]"
                                  : "bg-black/[0.04] text-black/50"
                              }`}
                            >
                              {acc.billingType}
                            </span>
                            <div className="flex-1" />
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusStyle(
                                acc.paymentStatus
                              )}`}
                            >
                              {statusIcon(acc.paymentStatus)}
                              {acc.paymentStatus}
                            </span>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-caption text-black/40 mb-1">
                                Amount
                              </p>
                              <p className="text-body font-semibold text-black/80">
                                {formatCurrency(acc.amount)}
                                {acc.billingType === "Retainer" && (
                                  <span className="text-caption text-black/30 font-normal">
                                    {" "}
                                    /mo
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-caption text-black/40 mb-1">
                                Outstanding
                              </p>
                              <p
                                className={`text-body font-semibold ${
                                  acc.outstandingAmount > 0
                                    ? "text-red-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {acc.outstandingAmount > 0
                                  ? formatCurrency(acc.outstandingAmount)
                                  : "₹0"}
                              </p>
                            </div>
                            <div>
                              <p className="text-caption text-black/40 mb-1">
                                Account Manager
                              </p>
                              <p className="text-body text-black/70">
                                {acc.accountManager}
                              </p>
                            </div>
                            {acc.nextBillingDate && (
                              <div>
                                <p className="text-caption text-black/40 mb-1">
                                  Next Billing
                                </p>
                                <p className="text-body text-black/70">
                                  {formatDate(acc.nextBillingDate)}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-caption text-black/40 mb-1">
                                Contract
                              </p>
                              <p className="text-body text-black/70">
                                {formatDate(acc.contractStart)} —{" "}
                                {formatDate(acc.contractEnd)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
