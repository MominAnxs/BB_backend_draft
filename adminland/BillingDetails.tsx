'use client';
import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  X,
  ChevronDown,
  Building2,
  CreditCard,
  RefreshCw,
  Send
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type BillingType = 'RETAINER' | 'OTS';
type ServiceType = 'Performance Marketing' | 'Accounts & Taxation';
type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Cancelled';
type InvoiceStatus = 'Sent' | 'Draft' | 'Scheduled';

interface BillingRecord {
  id: string;
  clientName: string;
  companyName: string;
  billingType: BillingType;
  serviceType: ServiceType;
  monthlyAmount: number;
  nextBillingDate: string;
  paymentStatus: PaymentStatus;
  invoiceStatus: InvoiceStatus;
  contractStartDate: string;
  contractEndDate: string;
  accountManager: string;
  lastPaymentDate: string;
  outstandingAmount: number;
  totalRevenue: number;
  notes: string;
}

export function BillingDetails() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillingType, setSelectedBillingType] = useState<BillingType | 'all'>('all');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | 'all'>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // Sample billing data
  const [billingRecords] = useState<BillingRecord[]>([
    {
      id: '1',
      clientName: 'Rajesh Kumar',
      companyName: 'Tech Solutions Pvt Ltd',
      billingType: 'RETAINER',
      serviceType: 'Performance Marketing',
      monthlyAmount: 75000,
      nextBillingDate: '2026-02-01',
      paymentStatus: 'Paid',
      invoiceStatus: 'Sent',
      contractStartDate: '2025-08-01',
      contractEndDate: '2026-08-01',
      accountManager: 'Priya Sharma',
      lastPaymentDate: '2026-01-05',
      outstandingAmount: 0,
      totalRevenue: 375000,
      notes: 'Quarterly review scheduled for March 2026'
    },
    {
      id: '2',
      clientName: 'Anil Mehta',
      companyName: 'HealthCare Plus',
      billingType: 'OTS',
      serviceType: 'Accounts & Taxation',
      monthlyAmount: 45000,
      nextBillingDate: '2026-01-25',
      paymentStatus: 'Pending',
      invoiceStatus: 'Sent',
      contractStartDate: '2026-01-10',
      contractEndDate: '2026-03-10',
      accountManager: 'Amit Singh',
      lastPaymentDate: '',
      outstandingAmount: 45000,
      totalRevenue: 45000,
      notes: 'One-time tax filing service'
    },
    {
      id: '3',
      clientName: 'Sunita Verma',
      companyName: 'EduTech Innovations',
      billingType: 'RETAINER',
      serviceType: 'Performance Marketing',
      monthlyAmount: 120000,
      nextBillingDate: '2026-02-05',
      paymentStatus: 'Overdue',
      invoiceStatus: 'Sent',
      contractStartDate: '2025-06-01',
      contractEndDate: '2026-12-01',
      accountManager: 'Kavita Reddy',
      lastPaymentDate: '2025-12-03',
      outstandingAmount: 120000,
      totalRevenue: 840000,
      notes: 'Follow up on overdue payment - contacted on Jan 15'
    },
    {
      id: '4',
      clientName: 'Vikram Patel',
      companyName: 'GreenEnergy Corp',
      billingType: 'RETAINER',
      serviceType: 'Accounts & Taxation',
      monthlyAmount: 60000,
      nextBillingDate: '2026-01-30',
      paymentStatus: 'Paid',
      invoiceStatus: 'Sent',
      contractStartDate: '2025-07-01',
      contractEndDate: '2026-07-01',
      accountManager: 'Ravi Kumar',
      lastPaymentDate: '2026-01-02',
      outstandingAmount: 0,
      totalRevenue: 360000,
      notes: 'Annual contract renewal due July 2026'
    },
    {
      id: '5',
      clientName: 'Meera Nair',
      companyName: 'Fashion Forward Pvt Ltd',
      billingType: 'OTS',
      serviceType: 'Performance Marketing',
      monthlyAmount: 95000,
      nextBillingDate: '2026-02-10',
      paymentStatus: 'Pending',
      invoiceStatus: 'Draft',
      contractStartDate: '2026-01-15',
      contractEndDate: '2026-04-15',
      accountManager: 'Priya Sharma',
      lastPaymentDate: '',
      outstandingAmount: 95000,
      totalRevenue: 95000,
      notes: 'Campaign launch for Spring collection'
    },
    {
      id: '6',
      clientName: 'Karthik Iyer',
      companyName: 'FinTech Solutions Ltd',
      billingType: 'RETAINER',
      serviceType: 'Performance Marketing',
      monthlyAmount: 150000,
      nextBillingDate: '2026-02-01',
      paymentStatus: 'Paid',
      invoiceStatus: 'Sent',
      contractStartDate: '2025-09-01',
      contractEndDate: '2027-09-01',
      accountManager: 'Amit Singh',
      lastPaymentDate: '2026-01-01',
      outstandingAmount: 0,
      totalRevenue: 600000,
      notes: '2-year contract, premium tier client'
    },
  ]);

  // Filter records
  const filteredRecords = billingRecords.filter(record => {
    const matchesSearch = 
      record.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.accountManager.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBillingType = selectedBillingType === 'all' || record.billingType === selectedBillingType;
    const matchesServiceType = selectedServiceType === 'all' || record.serviceType === selectedServiceType;
    const matchesPaymentStatus = selectedPaymentStatus === 'all' || record.paymentStatus === selectedPaymentStatus;

    return matchesSearch && matchesBillingType && matchesServiceType && matchesPaymentStatus;
  });

  // Calculate stats
  const stats = {
    totalClients: filteredRecords.length,
    retainerClients: filteredRecords.filter(r => r.billingType === 'RETAINER').length,
    otsClients: filteredRecords.filter(r => r.billingType === 'OTS').length,
    totalMRR: filteredRecords
      .filter(r => r.billingType === 'RETAINER')
      .reduce((sum, r) => sum + r.monthlyAmount, 0),
    pendingAmount: filteredRecords
      .filter(r => r.paymentStatus === 'Pending' || r.paymentStatus === 'Overdue')
      .reduce((sum, r) => sum + r.outstandingAmount, 0),
    overdueCount: filteredRecords.filter(r => r.paymentStatus === 'Overdue').length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Overdue':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getBillingTypeColor = (type: BillingType) => {
    return type === 'RETAINER' 
      ? 'bg-[#204CC7]/10 text-[#204CC7] border-[#204CC7]/20' 
      : 'bg-purple-50 text-purple-700 border-purple-200';
  };

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-black/90">Billing Details</h1>
          <p className="text-black/55 text-body mt-1">Manage client billing and invoicing across all services</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#204CC7] text-white rounded-xl hover:bg-[#1a3da0] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Billing Record
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Total Clients</span>
            <Building2 className="w-4 h-4 text-black/20" />
          </div>
          <div className="text-h1 font-semibold text-black/90">{stats.totalClients}</div>
          <div className="text-caption text-black/30 mt-1">Active billing records</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Retainer</span>
            <RefreshCw className="w-4 h-4 text-[#204CC7]/40" />
          </div>
          <div className="text-h1 font-semibold text-[#204CC7]">{stats.retainerClients}</div>
          <div className="text-caption text-black/30 mt-1">Recurring contracts</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">One-Time</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-h1 font-semibold text-purple-600">{stats.otsClients}</div>
          <div className="text-caption text-black/30 mt-1">OTS projects</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Monthly Recurring</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-h1 font-semibold text-emerald-600">{formatCurrency(stats.totalMRR)}</div>
          <div className="text-caption text-black/30 mt-1">MRR from retainers</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Pending Amount</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-h1 font-semibold text-amber-600">{formatCurrency(stats.pendingAmount)}</div>
          <div className="text-caption text-black/30 mt-1">Outstanding payments</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-h1 font-semibold text-red-600">{stats.overdueCount}</div>
          <div className="text-caption text-black/30 mt-1">Requires follow-up</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-black/5 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/55" />
            <input
              type="text"
              placeholder="Search by client, company, or account manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-96 pl-8 pr-7 py-2 bg-white border border-black/10 rounded-lg text-caption text-black placeholder-black/40 focus:outline-none focus:border-[#204CC7] focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/55 hover:text-black/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border text-caption font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              showFilters 
                ? 'bg-[#204CC7]/10 text-[#204CC7] border-[#204CC7]/20' 
                : 'bg-white text-black/70 border-black/10 hover:bg-black/5'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {(selectedBillingType !== 'all' || selectedServiceType !== 'all' || selectedPaymentStatus !== 'all') && (
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Export */}
          <button className="px-3 py-2 bg-white border border-black/10 text-black/70 text-caption font-medium rounded-lg hover:bg-black/5 transition-colors flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          {/* Bulk Actions (shown when records are selected) */}
          {selectedRecords.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#204CC7]/10 border border-[#204CC7]/20 rounded-lg">
              <span className="text-caption text-[#204CC7] font-medium">
                {selectedRecords.size} selected
              </span>
              <button className="ml-1 p-1 hover:bg-[#204CC7]/20 rounded transition-all">
                <Send className="w-3.5 h-3.5 text-[#204CC7]" />
              </button>
              <button 
                onClick={() => setSelectedRecords(new Set())}
                className="p-1 hover:bg-[#204CC7]/20 rounded transition-all"
              >
                <X className="w-3.5 h-3.5 text-[#204CC7]" />
              </button>
            </div>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-black/5">
            <div>
              <label className="block text-caption text-black/50 mb-2">Billing Type</label>
              <select
                value={selectedBillingType}
                onChange={(e) => setSelectedBillingType(e.target.value as BillingType | 'all')}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              >
                <option value="all">All Types</option>
                <option value="RETAINER">Retainer</option>
                <option value="OTS">One-Time Service</option>
              </select>
            </div>

            <div>
              <label className="block text-caption text-black/50 mb-2">Service Type</label>
              <select
                value={selectedServiceType}
                onChange={(e) => setSelectedServiceType(e.target.value as ServiceType | 'all')}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              >
                <option value="all">All Services</option>
                <option value="Performance Marketing">Performance Marketing</option>
                <option value="Accounts & Taxation">Accounts & Taxation</option>
              </select>
            </div>

            <div>
              <label className="block text-caption text-black/50 mb-2">Payment Status</label>
              <select
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value as PaymentStatus | 'all')}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Billing Records Table */}
      <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/5 border-b border-black/5">
              <tr>
                <th className="text-left px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-black/20 text-[#204CC7] focus:ring-[#204CC7]"
                  />
                </th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Client / Company</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Billing Type</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Service</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Amount</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Next Billing</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Payment Status</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Outstanding</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Account Manager</th>
                <th className="text-left px-4 py-3 text-caption font-medium text-black/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredRecords.map((record) => (
                <tr 
                  key={record.id}
                  className="hover:bg-black/[0.02] transition-colors"
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRecords.has(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      className="w-4 h-4 rounded border-black/20 text-[#204CC7] focus:ring-[#204CC7]"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-body font-medium text-black/90">{record.clientName}</span>
                      <span className="text-caption text-black/55">{record.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium border ${getBillingTypeColor(record.billingType)}`}>
                      {record.billingType === 'RETAINER' ? <RefreshCw className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {record.billingType}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-body text-black/60">{record.serviceType}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-body font-medium text-black/90">{formatCurrency(record.monthlyAmount)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-body text-black/60">
                      <Calendar className="w-3.5 h-3.5 text-black/30" />
                      {formatDate(record.nextBillingDate)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium border ${getPaymentStatusColor(record.paymentStatus)}`}>
                      {record.paymentStatus === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : 
                       record.paymentStatus === 'Overdue' ? <AlertCircle className="w-3 h-3" /> : 
                       <Clock className="w-3 h-3" />}
                      {record.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-body font-medium ${record.outstandingAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {record.outstandingAmount > 0 ? formatCurrency(record.outstandingAmount) : '₹0'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-body text-black/60">{record.accountManager}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setSelectedRecord(record);
                          setShowEditModal(true);
                        }}
                        className="p-2 hover:bg-black/5 rounded-lg transition-all group"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4 text-black/30 group-hover:text-[#204CC7]" />
                      </button>
                      <button 
                        className="p-2 hover:bg-black/5 rounded-lg transition-all group"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4 text-black/30 group-hover:text-black/60" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-black/10 mx-auto mb-3" />
              <p className="text-black/55 text-body">No billing records found</p>
              <p className="text-black/30 text-caption mt-1">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <BillingModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        isEdit={showEditModal}
      />
    </div>
  );
}

// Billing Modal Component
interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BillingRecord | null;
  isEdit: boolean;
}

function BillingModal({ isOpen, onClose, record, isEdit }: BillingModalProps) {
  const [formData, setFormData] = useState({
    clientName: record?.clientName || '',
    companyName: record?.companyName || '',
    billingType: record?.billingType || 'RETAINER' as BillingType,
    serviceType: record?.serviceType || 'Performance Marketing' as ServiceType,
    monthlyAmount: record?.monthlyAmount || 0,
    nextBillingDate: record?.nextBillingDate || '',
    paymentStatus: record?.paymentStatus || 'Pending' as PaymentStatus,
    contractStartDate: record?.contractStartDate || '',
    contractEndDate: record?.contractEndDate || '',
    accountManager: record?.accountManager || '',
    notes: record?.notes || '',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Billing Record' : 'Add New Billing Record'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update billing information for this client' : 'Create a new billing record for a client'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Client Name</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
                placeholder="Enter client name"
              />
            </div>
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
                placeholder="Enter company name"
              />
            </div>
          </div>

          {/* Billing Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Billing Type</label>
              <select
                value={formData.billingType}
                onChange={(e) => setFormData({ ...formData, billingType: e.target.value as BillingType })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              >
                <option value="RETAINER">Retainer</option>
                <option value="OTS">One-Time Service (OTS)</option>
              </select>
            </div>
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Service Type</label>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              >
                <option value="Performance Marketing">Performance Marketing</option>
                <option value="Accounts & Taxation">Accounts & Taxation</option>
              </select>
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">
                {formData.billingType === 'RETAINER' ? 'Monthly Amount' : 'Project Amount'}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                <input
                  type="number"
                  value={formData.monthlyAmount}
                  onChange={(e) => setFormData({ ...formData, monthlyAmount: Number(e.target.value) })}
                  className="w-full pl-10 pr-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Payment Status</label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Contract Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Contract Start</label>
              <input
                type="date"
                value={formData.contractStartDate}
                onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Contract End</label>
              <input
                type="date"
                value={formData.contractEndDate}
                onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-body font-medium text-black/70 mb-2">Next Billing Date</label>
              <input
                type="date"
                value={formData.nextBillingDate}
                onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Account Manager */}
          <div>
            <label className="block text-body font-medium text-black/70 mb-2">Account Manager</label>
            <input
              type="text"
              value={formData.accountManager}
              onChange={(e) => setFormData({ ...formData, accountManager: e.target.value })}
              className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all"
              placeholder="Assign account manager"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-body font-medium text-black/70 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-black/5 border border-transparent rounded-xl text-body focus:bg-white focus:border-black/10 focus:outline-none transition-all resize-none"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-black/60 hover:bg-black/5 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle save logic here
              onClose();
            }}
            className="px-4 py-2.5 bg-[#204CC7] text-white rounded-xl hover:bg-[#1a3da0] transition-all"
          >
            {isEdit ? 'Update Record' : 'Create Record'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}