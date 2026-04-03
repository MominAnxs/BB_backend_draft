'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw, MoreVertical, X, Users, CheckCircle2, Clock, AlertCircle, Tag, UserPlus, ArrowRight, CircleCheck, User, Check, Hash, Send, MessageSquareText, Building2, Shield, FileText, Zap, Eye, EyeOff, ChevronDown, ChevronUp, Download, Megaphone, Sparkles, ExternalLink } from 'lucide-react';
import { MonthNavigator, MONTHS } from './shared/MonthNavigator';
import { PeriodLabel } from './shared/PeriodLabel';

type View = 'clientList' | 'checklist';
type ProgressFilter = 'All' | 'Completed' | 'In Progress' | 'Not Started' | 'Overdue';
type CategoryFilter = 'All' | 'GST' | 'TDS' | 'Income Tax' | 'Bookkeeping' | 'Compliance' | 'Audit';

interface Filters {
  status: ProgressFilter;
  category: CategoryFilter;
  team: string;
  kickoff: KickoffStatus | 'All';
}

type KickoffStatus = 'Pending' | 'Onboarding' | 'Done';
type OnboardingStatus = 'Pending' | 'In Progress' | 'Complete';

interface Client {
  id: string;
  name: string;
  team: { initials: string; color: string }[];
  kickoffStatus: KickoffStatus;
  onboardingStatus: OnboardingStatus;
  progress: number;
  completedItems: number;
  totalItems: number;
  category: string;
  lastUpdated: string;
  isOverdue: boolean;
}

// ── A&T Business Info Types ──
interface PortalCredential {
  name: string;
  description: string;
  status: 'Provided' | 'Later' | 'Not Required';
  username?: string;
  password?: string;
}

interface DocumentItem {
  name: string;
  description: string;
  status: 'Uploaded' | 'Later' | 'Not Required';
  fileName?: string;
  fileSize?: string;
  uploadDate?: string;
}

interface ATBusinessInfoData {
  companyName: string;
  industry: string;
  gstNumber: string;
  panNumber: string;
  currentFinancialYear: string;
  taxCompliancePortals: PortalCredential[];
  accountingSoftware: PortalCredential[];
  paymentsCommerce: PortalCredential[];
  financialStatements: DocumentItem[];
  taxCompliance: DocumentItem[];
  expenseOperations: DocumentItem[];
  revenue: DocumentItem[];
}

// ── A&T Kickoff employee pool & role slots ──
const atEmployeePool = [
  { id: 'a1', name: 'Zubear Shaikh', role: 'HOD' },
  { id: 'a2', name: 'Rohan Desai', role: 'Sr. Manager' },
  { id: 'a3', name: 'Sneha Patel', role: 'Executive' },
  { id: 'a4', name: 'Vikram Singh', role: 'Jr. Executive' },
  { id: 'a5', name: 'Rahul Gupta', role: 'Jr. Executive' },
  { id: 'a6', name: 'Deepak Jain', role: 'Tax Analyst' },
  { id: 'a7', name: 'Nisha Agarwal', role: 'Compliance Officer' },
];

const atRoleSlots = [
  { role: 'HOD', required: true },
  { role: 'Sr. Manager', required: true },
  { role: 'Executive', required: true },
  { role: 'Jr. Executive', required: false },
];

interface ChecklistItem {
  id: string;
  particulars: string;
  work: string;
  date: string;
  status: 'Pending' | 'In Progress' | 'Done' | 'Overdue';
  comments: string;
  category: string;
}

const TEAM_MEMBERS: { initials: string; name: string }[] = [
  { initials: 'AF', name: 'Arjun Fernandes' },
  { initials: 'JN', name: 'Jaya Nair' },
  { initials: 'SM', name: 'Sahil Malhotra' },
  { initials: 'RK', name: 'Ritika Kapoor' },
];

const mockClients: Client[] = [
  { id: '1', name: '99 Pancakes', team: [{ initials: 'AF', color: '#1e293b' }, { initials: 'JN', color: '#7c3aed' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 100, completedItems: 12, totalItems: 12, category: 'GST', lastUpdated: '2 days ago', isOverdue: false },
  { id: '2', name: 'Anaya Collections', team: [{ initials: 'SM', color: '#0891b2' }, { initials: 'RK', color: '#475569' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 60, completedItems: 6, totalItems: 10, category: 'TDS', lastUpdated: '1 day ago', isOverdue: false },
  { id: '3', name: 'Alpine Group', team: [], kickoffStatus: 'Pending', onboardingStatus: 'Pending', progress: 0, completedItems: 0, totalItems: 10, category: 'GST', lastUpdated: 'New', isOverdue: false },
  { id: '4', name: 'Bilawala & Co (Heena)', team: [{ initials: 'JN', color: '#7c3aed' }, { initials: 'RK', color: '#475569' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 45, completedItems: 5, totalItems: 11, category: 'Income Tax', lastUpdated: '5 days ago', isOverdue: true },
  { id: '5', name: 'Bilawala & Co (Ayaz)', team: [{ initials: 'AF', color: '#1e293b' }, { initials: 'JN', color: '#7c3aed' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 80, completedItems: 8, totalItems: 10, category: 'Bookkeeping', lastUpdated: '1 day ago', isOverdue: false },
  { id: '6', name: 'CEO Rules', team: [{ initials: 'SM', color: '#0891b2' }, { initials: 'RK', color: '#475569' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 55, completedItems: 6, totalItems: 11, category: 'Compliance', lastUpdated: '4 days ago', isOverdue: true },
  { id: '7', name: 'Coast and Bloom', team: [], kickoffStatus: 'Pending', onboardingStatus: 'In Progress', progress: 0, completedItems: 0, totalItems: 10, category: 'GST', lastUpdated: 'New', isOverdue: false },
  { id: '8', name: 'FRR', team: [{ initials: 'JN', color: '#7c3aed' }, { initials: 'AF', color: '#1e293b' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 85, completedItems: 11, totalItems: 13, category: 'Audit', lastUpdated: '6 hours ago', isOverdue: false },
  { id: '9', name: 'FRR (BLOGS)', team: [{ initials: 'RK', color: '#475569' }, { initials: 'SM', color: '#0891b2' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 0, completedItems: 0, totalItems: 11, category: 'TDS', lastUpdated: '7 days ago', isOverdue: true },
  { id: '10', name: 'FRR (JAY + ADI)', team: [{ initials: 'AF', color: '#1e293b' }, { initials: 'RK', color: '#475569' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 50, completedItems: 6, totalItems: 12, category: 'Income Tax', lastUpdated: '3 days ago', isOverdue: false },
  { id: '11', name: 'Fundmart India Pvt Ltd', team: [{ initials: 'JN', color: '#7c3aed' }, { initials: 'SM', color: '#0891b2' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 100, completedItems: 10, totalItems: 10, category: 'GST', lastUpdated: '1 day ago', isOverdue: false },
  { id: '12', name: 'Green Valley Enterprises', team: [{ initials: 'AF', color: '#1e293b' }, { initials: 'RK', color: '#475569' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 40, completedItems: 4, totalItems: 10, category: 'Bookkeeping', lastUpdated: '6 days ago', isOverdue: true },
  { id: '13', name: 'Horizon Technologies', team: [{ initials: 'SM', color: '#0891b2' }, { initials: 'JN', color: '#7c3aed' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 75, completedItems: 9, totalItems: 12, category: 'Compliance', lastUpdated: '2 days ago', isOverdue: false },
  { id: '14', name: 'Infinity Solutions', team: [], kickoffStatus: 'Pending', onboardingStatus: 'Pending', progress: 0, completedItems: 0, totalItems: 10, category: 'Audit', lastUpdated: 'New', isOverdue: false },
  { id: '15', name: 'Jupiter Consulting', team: [{ initials: 'JN', color: '#7c3aed' }, { initials: 'RK', color: '#475569' }], kickoffStatus: 'Done', onboardingStatus: 'Complete', progress: 85, completedItems: 9, totalItems: 11, category: 'GST', lastUpdated: '1 day ago', isOverdue: false },
];

// ── A&T Business Info Mock Data ──
const atBusinessInfo: Record<string, ATBusinessInfoData> = {
  '1': {
    companyName: '99 Pancakes', industry: 'Food & Beverage', gstNumber: '27AABCU9603R1ZM', panNumber: 'AABCU9603R', currentFinancialYear: 'FY 2025-26 (Apr 2025 - Mar 2026)',
    taxCompliancePortals: [
      { name: 'GST Portal', description: 'GSTR filing access', status: 'Provided', username: '27AABCU9603R1ZM', password: 'Gst@99pan2025' },
      { name: 'TDS Portal', description: 'TDS return e-filing', status: 'Provided', username: 'AABCU9603R', password: 'Tds#99p2025' },
      { name: 'Income Tax Portal', description: 'ITR e-filing access', status: 'Provided', username: 'AABCU9603R', password: 'ITR@99pan25' },
      { name: 'PT/CPT Portal', description: 'PTEC & PTRC access', status: 'Later' },
      { name: 'E-Invoice Portal', description: 'E-invoice generation', status: 'Provided', username: '27AABCU9603R1ZM', password: 'Einv@99pan' },
    ],
    accountingSoftware: [
      { name: 'Tally Prime', description: 'Tally / ERP access', status: 'Provided', username: 'admin@99pancakes', password: 'Tally#99p2025' },
      { name: 'Internal Software', description: 'ERP, billing, or custom tools', status: 'Later' },
    ],
    paymentsCommerce: [
      { name: 'Payment Gateway', description: 'Gateway / bank portal', status: 'Provided', username: 'merchant_99pan', password: 'PG@99pan2025' },
      { name: 'POS System', description: 'Point of Sale access', status: 'Provided', username: 'pos_admin', password: 'POS#99pan' },
      { name: 'Payroll System', description: 'Payroll software access', status: 'Later' },
      { name: 'Prepaid Partners', description: 'Recharge / wallet portals', status: 'Not Required' },
      { name: 'COD Portal', description: 'Cash-on-delivery portal', status: 'Not Required' },
      { name: 'E-Commerce Portals', description: 'Online store platforms', status: 'Not Required' },
    ],
    financialStatements: [
      { name: 'Audited Financial Statement', description: 'Latest audited P&L and Balance Sheet', status: 'Uploaded', fileName: '99Pancakes_AuditedFS_FY2425.pdf', fileSize: '2.4 MB', uploadDate: '2026-02-15' },
      { name: 'Latest Tally Backup', description: 'Most recent Tally data backup (.tbk)', status: 'Uploaded', fileName: '99Pan_TallyBackup_Mar2026.tbk', fileSize: '18.7 MB', uploadDate: '2026-03-28' },
      { name: 'Company / LLP Document', description: 'Incorporation cert, MOA/AOA', status: 'Uploaded', fileName: '99Pancakes_COI_MOA.pdf', fileSize: '1.1 MB', uploadDate: '2026-01-10' },
      { name: 'Latest Bank Statement', description: 'Current A/C statements (last 6 months)', status: 'Later' },
    ],
    taxCompliance: [
      { name: 'Past TDS & GST Workings', description: 'Previous period computation sheets', status: 'Uploaded', fileName: '99Pan_TDS_GST_Q3.xlsx', fileSize: '840 KB', uploadDate: '2026-02-20' },
      { name: 'NBFC Loan Repayment Schedule', description: 'Loan statement or repayment schedule', status: 'Not Required' },
    ],
    expenseOperations: [
      { name: 'Purchase / Expense Data', description: 'Vendor invoices, purchase registers', status: 'Uploaded', fileName: '99Pan_PurchaseRegister_Mar26.xlsx', fileSize: '1.3 MB', uploadDate: '2026-03-25' },
      { name: 'Credit Card Statement', description: 'Business credit card statements', status: 'Later' },
      { name: 'Reimbursement Data', description: 'Expense claims & approvals', status: 'Later' },
      { name: 'Salary Register', description: 'Monthly payroll & salary breakdowns', status: 'Uploaded', fileName: '99Pan_SalaryReg_Mar2026.xlsx', fileSize: '520 KB', uploadDate: '2026-03-30' },
      { name: 'Petty Cash Register', description: 'Office & miscellaneous cash expenses', status: 'Later' },
    ],
    revenue: [
      { name: 'Sales Data', description: 'Sales invoices, revenue registers', status: 'Uploaded', fileName: '99Pan_SalesData_Mar2026.xlsx', fileSize: '2.1 MB', uploadDate: '2026-03-29' },
    ],
  },
  '2': {
    companyName: 'Anaya Collections', industry: 'E-Commerce', gstNumber: '27AADCA3421L1ZN', panNumber: 'AADCA3421L', currentFinancialYear: 'FY 2025-26 (Apr 2025 - Mar 2026)',
    taxCompliancePortals: [
      { name: 'GST Portal', description: 'GSTR filing access', status: 'Provided', username: '27AADCA3421L1ZN', password: 'Gst@anaya25' },
      { name: 'TDS Portal', description: 'TDS return e-filing', status: 'Provided', username: 'AADCA3421L', password: 'Tds#anaya2025' },
      { name: 'Income Tax Portal', description: 'ITR e-filing access', status: 'Later' },
      { name: 'PT/CPT Portal', description: 'PTEC & PTRC access', status: 'Not Required' },
      { name: 'E-Invoice Portal', description: 'E-invoice generation', status: 'Provided', username: '27AADCA3421L1ZN', password: 'Einv@anaya' },
    ],
    accountingSoftware: [
      { name: 'Tally Prime', description: 'Tally / ERP access', status: 'Provided', username: 'admin@anayacollections', password: 'Tally#anaya25' },
      { name: 'Internal Software', description: 'ERP, billing, or custom tools', status: 'Not Required' },
    ],
    paymentsCommerce: [
      { name: 'Payment Gateway', description: 'Gateway / bank portal', status: 'Provided', username: 'merchant_anaya', password: 'PG@anaya2025' },
      { name: 'POS System', description: 'Point of Sale access', status: 'Not Required' },
      { name: 'Payroll System', description: 'Payroll software access', status: 'Later' },
      { name: 'Prepaid Partners', description: 'Recharge / wallet portals', status: 'Not Required' },
      { name: 'COD Portal', description: 'Cash-on-delivery portal', status: 'Provided', username: 'anaya_cod', password: 'COD#anaya25' },
      { name: 'E-Commerce Portals', description: 'Online store platforms', status: 'Provided', username: 'anaya_shopify', password: 'Shop@anaya25' },
    ],
    financialStatements: [
      { name: 'Audited Financial Statement', description: 'Latest audited P&L and Balance Sheet', status: 'Uploaded', fileName: 'Anaya_AuditedFS_FY2425.pdf', fileSize: '1.8 MB', uploadDate: '2026-02-10' },
      { name: 'Latest Tally Backup', description: 'Most recent Tally data backup (.tbk)', status: 'Later' },
      { name: 'Company / LLP Document', description: 'Incorporation cert, MOA/AOA', status: 'Uploaded', fileName: 'AnayaCollections_COI.pdf', fileSize: '960 KB', uploadDate: '2026-01-05' },
      { name: 'Latest Bank Statement', description: 'Current A/C statements (last 6 months)', status: 'Uploaded', fileName: 'Anaya_BankStmt_Oct25_Mar26.pdf', fileSize: '3.2 MB', uploadDate: '2026-03-20' },
    ],
    taxCompliance: [
      { name: 'Past TDS & GST Workings', description: 'Previous period computation sheets', status: 'Uploaded', fileName: 'Anaya_TDS_GST_FY2425.xlsx', fileSize: '720 KB', uploadDate: '2026-02-18' },
      { name: 'NBFC Loan Repayment Schedule', description: 'Loan statement or repayment schedule', status: 'Not Required' },
    ],
    expenseOperations: [
      { name: 'Purchase / Expense Data', description: 'Vendor invoices, purchase registers', status: 'Uploaded', fileName: 'Anaya_PurchaseReg_Mar26.xlsx', fileSize: '1.5 MB', uploadDate: '2026-03-22' },
      { name: 'Credit Card Statement', description: 'Business credit card statements', status: 'Not Required' },
      { name: 'Reimbursement Data', description: 'Expense claims & approvals', status: 'Later' },
      { name: 'Salary Register', description: 'Monthly payroll & salary breakdowns', status: 'Later' },
      { name: 'Petty Cash Register', description: 'Office & miscellaneous cash expenses', status: 'Not Required' },
    ],
    revenue: [
      { name: 'Sales Data', description: 'Sales invoices, revenue registers', status: 'Uploaded', fileName: 'Anaya_SalesData_Mar2026.xlsx', fileSize: '1.9 MB', uploadDate: '2026-03-28' },
    ],
  },
  '4': {
    companyName: 'Bilawala & Co (Heena)', industry: 'Retail & Trading', gstNumber: '27AABCB5678L1ZP', panNumber: 'AABCB5678L', currentFinancialYear: 'FY 2025-26 (Apr 2025 - Mar 2026)',
    taxCompliancePortals: [
      { name: 'GST Portal', description: 'GSTR filing access', status: 'Provided', username: '27AABCB5678L1ZP', password: 'Gst@bilawala25' },
      { name: 'TDS Portal', description: 'TDS return e-filing', status: 'Later' },
      { name: 'Income Tax Portal', description: 'ITR e-filing access', status: 'Provided', username: 'AABCB5678L', password: 'ITR@heena25' },
      { name: 'PT/CPT Portal', description: 'PTEC & PTRC access', status: 'Provided', username: 'PTEC_bilawala', password: 'PT@bila2025' },
      { name: 'E-Invoice Portal', description: 'E-invoice generation', status: 'Not Required' },
    ],
    accountingSoftware: [
      { name: 'Tally Prime', description: 'Tally / ERP access', status: 'Provided', username: 'admin@bilawala', password: 'Tally#bila25' },
      { name: 'Internal Software', description: 'ERP, billing, or custom tools', status: 'Not Required' },
    ],
    paymentsCommerce: [
      { name: 'Payment Gateway', description: 'Gateway / bank portal', status: 'Provided', username: 'merchant_bilawala', password: 'PG@bila2025' },
      { name: 'POS System', description: 'Point of Sale access', status: 'Later' },
      { name: 'Payroll System', description: 'Payroll software access', status: 'Provided', username: 'payroll_bila', password: 'Pay#bila25' },
      { name: 'Prepaid Partners', description: 'Recharge / wallet portals', status: 'Not Required' },
      { name: 'COD Portal', description: 'Cash-on-delivery portal', status: 'Not Required' },
      { name: 'E-Commerce Portals', description: 'Online store platforms', status: 'Not Required' },
    ],
    financialStatements: [
      { name: 'Audited Financial Statement', description: 'Latest audited P&L and Balance Sheet', status: 'Uploaded', fileName: 'Bilawala_Heena_AuditedFS.pdf', fileSize: '2.0 MB', uploadDate: '2026-02-12' },
      { name: 'Latest Tally Backup', description: 'Most recent Tally data backup (.tbk)', status: 'Uploaded', fileName: 'Bilawala_H_Tally_Mar26.tbk', fileSize: '22.1 MB', uploadDate: '2026-03-27' },
      { name: 'Company / LLP Document', description: 'Incorporation cert, MOA/AOA', status: 'Uploaded', fileName: 'Bilawala_PartnershipDeed.pdf', fileSize: '1.4 MB', uploadDate: '2026-01-08' },
      { name: 'Latest Bank Statement', description: 'Current A/C statements (last 6 months)', status: 'Uploaded', fileName: 'Bilawala_H_BankStmt.pdf', fileSize: '2.8 MB', uploadDate: '2026-03-18' },
    ],
    taxCompliance: [
      { name: 'Past TDS & GST Workings', description: 'Previous period computation sheets', status: 'Later' },
      { name: 'NBFC Loan Repayment Schedule', description: 'Loan statement or repayment schedule', status: 'Not Required' },
    ],
    expenseOperations: [
      { name: 'Purchase / Expense Data', description: 'Vendor invoices, purchase registers', status: 'Uploaded', fileName: 'Bilawala_H_PurchReg_Mar26.xlsx', fileSize: '1.7 MB', uploadDate: '2026-03-24' },
      { name: 'Credit Card Statement', description: 'Business credit card statements', status: 'Uploaded', fileName: 'Bilawala_H_CC_Mar26.pdf', fileSize: '450 KB', uploadDate: '2026-03-26' },
      { name: 'Reimbursement Data', description: 'Expense claims & approvals', status: 'Not Required' },
      { name: 'Salary Register', description: 'Monthly payroll & salary breakdowns', status: 'Uploaded', fileName: 'Bilawala_H_Salary_Mar26.xlsx', fileSize: '380 KB', uploadDate: '2026-03-30' },
      { name: 'Petty Cash Register', description: 'Office & miscellaneous cash expenses', status: 'Later' },
    ],
    revenue: [
      { name: 'Sales Data', description: 'Sales invoices, revenue registers', status: 'Uploaded', fileName: 'Bilawala_H_Sales_Mar26.xlsx', fileSize: '1.2 MB', uploadDate: '2026-03-29' },
    ],
  },
  '8': {
    companyName: 'FRR', industry: 'Hospitality', gstNumber: '27AABCF7890N1ZS', panNumber: 'AABCF7890N', currentFinancialYear: 'FY 2025-26 (Apr 2025 - Mar 2026)',
    taxCompliancePortals: [
      { name: 'GST Portal', description: 'GSTR filing access', status: 'Provided', username: '27AABCF7890N1ZS', password: 'Gst@frr2025' },
      { name: 'TDS Portal', description: 'TDS return e-filing', status: 'Provided', username: 'AABCF7890N', password: 'Tds#frr2025' },
      { name: 'Income Tax Portal', description: 'ITR e-filing access', status: 'Provided', username: 'AABCF7890N', password: 'ITR@frr25' },
      { name: 'PT/CPT Portal', description: 'PTEC & PTRC access', status: 'Provided', username: 'PTEC_frr', password: 'PT@frr2025' },
      { name: 'E-Invoice Portal', description: 'E-invoice generation', status: 'Provided', username: '27AABCF7890N1ZS', password: 'Einv@frr25' },
    ],
    accountingSoftware: [
      { name: 'Tally Prime', description: 'Tally / ERP access', status: 'Provided', username: 'admin@frr', password: 'Tally#frr25' },
      { name: 'Internal Software', description: 'ERP, billing, or custom tools', status: 'Provided', username: 'frr_erp_admin', password: 'ERP@frr2025' },
    ],
    paymentsCommerce: [
      { name: 'Payment Gateway', description: 'Gateway / bank portal', status: 'Provided', username: 'merchant_frr', password: 'PG@frr2025' },
      { name: 'POS System', description: 'Point of Sale access', status: 'Provided', username: 'pos_frr', password: 'POS#frr25' },
      { name: 'Payroll System', description: 'Payroll software access', status: 'Provided', username: 'payroll_frr', password: 'Pay#frr25' },
      { name: 'Prepaid Partners', description: 'Recharge / wallet portals', status: 'Later' },
      { name: 'COD Portal', description: 'Cash-on-delivery portal', status: 'Provided', username: 'frr_cod', password: 'COD#frr25' },
      { name: 'E-Commerce Portals', description: 'Online store platforms', status: 'Provided', username: 'frr_swiggy', password: 'Swiggy@frr25' },
    ],
    financialStatements: [
      { name: 'Audited Financial Statement', description: 'Latest audited P&L and Balance Sheet', status: 'Uploaded', fileName: 'FRR_AuditedFS_FY2425.pdf', fileSize: '3.1 MB', uploadDate: '2026-02-08' },
      { name: 'Latest Tally Backup', description: 'Most recent Tally data backup (.tbk)', status: 'Uploaded', fileName: 'FRR_TallyBackup_Mar26.tbk', fileSize: '35.4 MB', uploadDate: '2026-03-29' },
      { name: 'Company / LLP Document', description: 'Incorporation cert, MOA/AOA', status: 'Uploaded', fileName: 'FRR_COI_MOA_AOA.pdf', fileSize: '1.6 MB', uploadDate: '2026-01-12' },
      { name: 'Latest Bank Statement', description: 'Current A/C statements (last 6 months)', status: 'Uploaded', fileName: 'FRR_BankStmt_Oct25_Mar26.pdf', fileSize: '4.5 MB', uploadDate: '2026-03-28' },
    ],
    taxCompliance: [
      { name: 'Past TDS & GST Workings', description: 'Previous period computation sheets', status: 'Uploaded', fileName: 'FRR_TDS_GST_FY2425.xlsx', fileSize: '1.1 MB', uploadDate: '2026-02-22' },
      { name: 'NBFC Loan Repayment Schedule', description: 'Loan statement or repayment schedule', status: 'Later' },
    ],
    expenseOperations: [
      { name: 'Purchase / Expense Data', description: 'Vendor invoices, purchase registers', status: 'Uploaded', fileName: 'FRR_PurchReg_Mar26.xlsx', fileSize: '2.3 MB', uploadDate: '2026-03-26' },
      { name: 'Credit Card Statement', description: 'Business credit card statements', status: 'Uploaded', fileName: 'FRR_CC_Statement_Mar26.pdf', fileSize: '680 KB', uploadDate: '2026-03-27' },
      { name: 'Reimbursement Data', description: 'Expense claims & approvals', status: 'Uploaded', fileName: 'FRR_Reimbursements_Mar26.xlsx', fileSize: '320 KB', uploadDate: '2026-03-28' },
      { name: 'Salary Register', description: 'Monthly payroll & salary breakdowns', status: 'Uploaded', fileName: 'FRR_SalaryReg_Mar26.xlsx', fileSize: '590 KB', uploadDate: '2026-03-30' },
      { name: 'Petty Cash Register', description: 'Office & miscellaneous cash expenses', status: 'Uploaded', fileName: 'FRR_PettyCash_Mar26.xlsx', fileSize: '210 KB', uploadDate: '2026-03-30' },
    ],
    revenue: [
      { name: 'Sales Data', description: 'Sales invoices, revenue registers', status: 'Uploaded', fileName: 'FRR_SalesData_Mar26.xlsx', fileSize: '3.8 MB', uploadDate: '2026-03-29' },
    ],
  },
};

const standardChecklistItems: ChecklistItem[] = [
  { id: '1', particulars: 'GST Return Filing', work: 'Monthly GST-3B Return', date: '2026-04-20', status: 'Pending', comments: '', category: 'GST' },
  { id: '2', particulars: 'TDS Return', work: 'Quarterly TDS Filing', date: '2026-03-31', status: 'Done', comments: 'Filed on time', category: 'TDS' },
  { id: '3', particulars: 'Income Tax', work: 'Advance Tax Payment', date: '2026-03-15', status: 'Overdue', comments: '', category: 'Income Tax' },
  { id: '4', particulars: 'Bookkeeping', work: 'Monthly Books Reconciliation', date: '2026-04-05', status: 'Done', comments: 'Completed', category: 'Bookkeeping' },
  { id: '5', particulars: 'Payroll', work: 'Salary Processing', date: '2026-03-31', status: 'Done', comments: '', category: 'Bookkeeping' },
  { id: '6', particulars: 'Compliance', work: 'ROC Annual Filing', date: '2026-03-25', status: 'Overdue', comments: 'Awaiting documents', category: 'Compliance' },
  { id: '7', particulars: 'GST Return Filing', work: 'Annual GST-9 Return', date: '2026-04-02', status: 'Pending', comments: '', category: 'GST' },
  { id: '8', particulars: 'Audit', work: 'Internal Audit Review', date: '2026-04-15', status: 'Done', comments: '', category: 'Audit' },
  { id: '9', particulars: 'Financial Statements', work: 'Monthly P&L Report', date: '2026-04-01', status: 'Pending', comments: '', category: 'Bookkeeping' },
  { id: '10', particulars: 'Bank Reconciliation', work: 'Bank Statement Review', date: '2026-04-05', status: 'Done', comments: 'All matched', category: 'Bookkeeping' },
];

// ── A&T Business Info Modal ──
function ATBusinessInfoModal({ client, onClose }: {
  client: Client;
  onClose: () => void;
}) {
  const info = atBusinessInfo[client.id];
  const [activeTab, setActiveTab] = useState<'basic' | 'portals' | 'documents'>('basic');
  const [expandedPortal, setExpandedPortal] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [showNudgeOverlay, setShowNudgeOverlay] = useState(false);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [nudgeSending, setNudgeSending] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!info) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div role="dialog" aria-modal="true" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[540px] p-10 text-center" style={{ animation: 'atBiSlideUp 0.25s ease-out' }} onClick={(e) => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-7 h-7 text-black/20" />
          </div>
          <h2 className="text-h2 font-bold text-black/80 mb-2">No business info yet</h2>
          <p className="text-body text-black/40 mb-7 max-w-[340px] mx-auto leading-relaxed">This client hasn&apos;t completed the onboarding form on the client app yet.</p>
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-black/[0.04] text-black/50 text-body font-medium hover:bg-black/[0.07] transition-colors">Close</button>
        </div>
        <style jsx>{`@keyframes atBiSlideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      </div>
    );
  }

  const portalStatusStyle = (status: string) => {
    if (status === 'Provided') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' };
    if (status === 'Later') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-400' };
    return { bg: 'bg-black/[0.02]', text: 'text-black/30', border: 'border-black/[0.04]', dot: 'bg-black/20' };
  };

  const docStatusStyle = (status: string) => {
    if (status === 'Uploaded') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: CheckCircle2 };
    if (status === 'Later') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: Clock };
    return { bg: 'bg-black/[0.02]', text: 'text-black/30', border: 'border-black/[0.04]', icon: X };
  };

  // Count stats
  const allPortals = [...info.taxCompliancePortals, ...info.accountingSoftware, ...info.paymentsCommerce];
  const portalsProvided = allPortals.filter(p => p.status === 'Provided').length;
  const allDocs = [...info.financialStatements, ...info.taxCompliance, ...info.expenseOperations, ...info.revenue];
  const docsUploaded = allDocs.filter(d => d.status === 'Uploaded').length;

  // Pending "Later" items for nudge system
  const laterPortals = allPortals.filter(p => p.status === 'Later');
  const laterDocs = allDocs.filter(d => d.status === 'Later');
  const totalLaterItems = laterPortals.length + laterDocs.length;

  // Client channel slug (matches Inbox convention)
  const clientChannelName = info.companyName;
  const clientChannelSlug = info.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Generate smart nudge message
  const generateNudgeMessage = () => {
    const lines: string[] = [];
    lines.push(`Hi ${info.companyName} team! 👋`);
    lines.push('');
    lines.push(`We noticed a few items are still pending on your onboarding checklist. Completing these will help us serve you faster and more efficiently.`);

    if (laterPortals.length > 0) {
      lines.push('');
      lines.push(`🔐 Portal Credentials Needed (${laterPortals.length}):`);
      laterPortals.forEach(p => lines.push(`  • ${p.name} — ${p.description}`));
    }

    if (laterDocs.length > 0) {
      lines.push('');
      lines.push(`📄 Documents Pending Upload (${laterDocs.length}):`);
      laterDocs.forEach(d => lines.push(`  • ${d.name} — ${d.description}`));
    }

    lines.push('');
    lines.push('You can complete these directly in the Brego Client App under Business Info. Let us know if you need any help!');
    return lines.join('\n');
  };

  const handleSendNudge = () => {
    setNudgeSending(true);
    setTimeout(() => {
      setNudgeSending(false);
      setNudgeSent(true);
      setTimeout(() => {
        setShowNudgeOverlay(false);
        setTimeout(() => setNudgeSent(false), 300);
      }, 2000);
    }, 1200);
  };

  const tabs = [
    { key: 'basic' as const, label: 'Basic Info', icon: Building2 },
    { key: 'portals' as const, label: `Portals (${portalsProvided}/${allPortals.length})`, icon: Shield },
    { key: 'documents' as const, label: `Documents (${docsUploaded}/${allDocs.length})`, icon: FileText },
  ];

  const togglePassword = (key: string) => setShowPassword(prev => ({ ...prev, [key]: !prev[key] }));

  const renderPortalGroup = (title: string, portals: PortalCredential[]) => (
    <div key={title}>
      <h4 className="text-[11px] font-semibold text-black/40 uppercase tracking-wide mb-2.5">{title}</h4>
      <div className="space-y-2">
        {portals.map((portal, i) => {
          const s = portalStatusStyle(portal.status);
          const portalKey = `${title}-${i}`;
          const isExpanded = expandedPortal === portalKey;
          const hasCredentials = portal.status === 'Provided' && portal.username;
          return (
            <div key={i} className="rounded-xl border border-black/[0.05] hover:border-black/10 transition-all overflow-hidden">
              <button
                onClick={() => hasCredentials ? setExpandedPortal(isExpanded ? null : portalKey) : undefined}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hasCredentials ? 'cursor-pointer hover:bg-black/[0.01]' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black/[0.025] flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-black/25" />
                  </div>
                  <div className="text-left">
                    <p className="text-body text-black/75 font-semibold">{portal.name}</p>
                    <p className="text-caption text-black/35">{portal.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${s.bg} ${s.text} border ${s.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {portal.status}
                  </span>
                  {hasCredentials && (
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isExpanded ? 'bg-[#06B6D4]/10' : 'bg-black/[0.03]'}`}>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#06B6D4]" /> : <ChevronDown className="w-3.5 h-3.5 text-black/25" />}
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded credentials */}
              {isExpanded && hasCredentials && (
                <div className="px-4 pb-4 pt-1" style={{ animation: 'atBiSlideUp 0.15s ease-out' }}>
                  <div className="ml-12 bg-black/[0.015] border border-black/[0.04] rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white border border-black/[0.05] px-3.5 py-3">
                        <label className="text-[11px] font-semibold text-black/35 uppercase tracking-wide block mb-1.5">Username</label>
                        <span className="text-body text-black/70 font-medium font-mono tracking-wide">{portal.username}</span>
                      </div>
                      <div className="rounded-lg bg-white border border-black/[0.05] px-3.5 py-3">
                        <label className="text-[11px] font-semibold text-black/35 uppercase tracking-wide block mb-1.5">Password</label>
                        <div className="flex items-center gap-2">
                          <span className="text-body text-black/70 font-medium font-mono tracking-wide flex-1 min-w-0 truncate">
                            {showPassword[portalKey] ? portal.password : '••••••••••'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePassword(portalKey); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.04] transition-colors flex-shrink-0"
                            aria-label={showPassword[portalKey] ? 'Hide password' : 'Show password'}
                          >
                            {showPassword[portalKey]
                              ? <EyeOff className="w-3.5 h-3.5 text-black/30" />
                              : <Eye className="w-3.5 h-3.5 text-black/30" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDocGroup = (title: string, docs: DocumentItem[]) => (
    <div key={title}>
      <h4 className="text-[11px] font-semibold text-black/40 uppercase tracking-wide mb-2.5">{title}</h4>
      <div className="space-y-2">
        {docs.map((doc, i) => {
          const s = docStatusStyle(doc.status);
          const StatusIcon = s.icon;
          const docKey = `${title}-${i}`;
          const isExpanded = expandedDoc === docKey;
          const hasFileInfo = doc.status === 'Uploaded' && doc.fileName;
          return (
            <div key={i} className="rounded-xl border border-black/[0.05] hover:border-black/10 transition-all overflow-hidden">
              <button
                onClick={() => hasFileInfo ? setExpandedDoc(isExpanded ? null : docKey) : undefined}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hasFileInfo ? 'cursor-pointer hover:bg-black/[0.01]' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black/[0.025] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-black/25" />
                  </div>
                  <div className="text-left">
                    <p className="text-body text-black/75 font-semibold">{doc.name}</p>
                    <p className="text-caption text-black/35">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${s.bg} ${s.text} border ${s.border}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {doc.status}
                  </span>
                  {hasFileInfo && (
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isExpanded ? 'bg-[#06B6D4]/10' : 'bg-black/[0.03]'}`}>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#06B6D4]" /> : <ChevronDown className="w-3.5 h-3.5 text-black/25" />}
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded file details */}
              {isExpanded && hasFileInfo && (
                <div className="px-4 pb-4 pt-1" style={{ animation: 'atBiSlideUp 0.15s ease-out' }}>
                  <div className="ml-12 bg-black/[0.015] border border-black/[0.04] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/8 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4.5 h-4.5 text-[#06B6D4]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-black/75 font-semibold truncate">{doc.fileName}</p>
                        <div className="flex items-center gap-2.5 mt-0.5">
                          <span className="text-caption text-black/35">{doc.fileSize}</span>
                          <span className="text-black/15">·</span>
                          <span className="text-caption text-black/35">Uploaded {doc.uploadDate}</span>
                        </div>
                      </div>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#06B6D4]/10 transition-colors group" aria-label="Download file">
                        <Download className="w-4 h-4 text-black/20 group-hover:text-[#06B6D4]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog" aria-modal="true" aria-labelledby="at-bi-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[780px] max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: 'atBiSlideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-0">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#06B6D4]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 id="at-bi-modal-title" className="text-h2 font-bold text-black/90">{info.companyName}</h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border text-[#06B6D4] bg-cyan-50/60 border-cyan-200/50">A&T</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-caption text-black/40">{info.industry}</span>
                  <span className="text-black/15">·</span>
                  <span className="text-caption text-black/40">GST: {info.gstNumber}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-black/[0.04] transition-colors -mr-1 mt-0.5" aria-label="Close">
              <X className="w-[18px] h-[18px] text-black/30" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-stretch bg-black/[0.025] rounded-xl p-1 gap-1 mb-0">
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2.5 rounded-lg text-body font-semibold transition-all text-center flex items-center justify-center gap-2 ${
                    isActive ? 'bg-white shadow-sm text-[#06B6D4]' : 'text-black/30 hover:text-black/50 hover:bg-white/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-black/[0.06] mt-5" />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* ── BASIC INFO TAB ── */}
          {activeTab === 'basic' && (
            <div className="space-y-6" style={{ animation: 'atBiSlideUp 0.15s ease-out' }}>
              <div>
                <h3 className="text-[11px] font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide">
                  <Building2 className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Company Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                    <label className="text-caption text-black/35 font-medium block mb-1">Company Name</label>
                    <p className="text-body text-black/75 font-medium">{info.companyName}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                    <label className="text-caption text-black/35 font-medium block mb-1">Industry</label>
                    <p className="text-body text-black/75 font-medium">{info.industry}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              <div>
                <h3 className="text-[11px] font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide">
                  <Shield className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Compliance Details
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-cyan-50/40 border border-cyan-200/30 px-4 py-3.5">
                    <label className="text-caption text-[#06B6D4]/60 font-medium block mb-1">GST Number</label>
                    <p className="text-body text-black/75 font-bold tracking-wide">{info.gstNumber}</p>
                  </div>
                  <div className="rounded-xl bg-cyan-50/40 border border-cyan-200/30 px-4 py-3.5">
                    <label className="text-caption text-[#06B6D4]/60 font-medium block mb-1">PAN Number</label>
                    <p className="text-body text-black/75 font-bold tracking-wide">{info.panNumber}</p>
                  </div>
                  <div className="rounded-xl bg-cyan-50/40 border border-cyan-200/30 px-4 py-3.5">
                    <label className="text-caption text-[#06B6D4]/60 font-medium block mb-1">Current Financial Year</label>
                    <p className="text-body text-black/75 font-semibold">{info.currentFinancialYear}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Quick Overview Stats */}
              <div>
                <h3 className="text-[11px] font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide">
                  <Zap className="w-3.5 h-3.5 text-[#FDAB3D]" />
                  Onboarding Progress
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                    <label className="text-caption text-black/35 font-medium block mb-1.5">Portal Credentials</label>
                    <div className="flex items-center gap-2">
                      <span className="text-h3 font-bold text-[#06B6D4]">{portalsProvided}</span>
                      <span className="text-caption text-black/30">/ {allPortals.length} provided</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/[0.04] rounded-full mt-2">
                      <div className="h-full bg-[#06B6D4] rounded-full transition-all" style={{ width: `${(portalsProvided / allPortals.length) * 100}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                    <label className="text-caption text-black/35 font-medium block mb-1.5">Documents</label>
                    <div className="flex items-center gap-2">
                      <span className="text-h3 font-bold text-[#00C875]">{docsUploaded}</span>
                      <span className="text-caption text-black/30">/ {allDocs.length} uploaded</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/[0.04] rounded-full mt-2">
                      <div className="h-full bg-[#00C875] rounded-full transition-all" style={{ width: `${(docsUploaded / allDocs.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PORTALS TAB ── */}
          {activeTab === 'portals' && (
            <div className="space-y-6" style={{ animation: 'atBiSlideUp 0.15s ease-out' }}>
              {renderPortalGroup('Tax & Compliance Portals', info.taxCompliancePortals)}
              {renderPortalGroup('Accounting & Software', info.accountingSoftware)}
              {renderPortalGroup('Payments & Commerce', info.paymentsCommerce)}
            </div>
          )}

          {/* ── DOCUMENTS TAB ── */}
          {activeTab === 'documents' && (
            <div className="space-y-6" style={{ animation: 'atBiSlideUp 0.15s ease-out' }}>
              {renderDocGroup('Financial Statements', info.financialStatements)}
              {renderDocGroup('Tax & Compliance', info.taxCompliance)}
              {renderDocGroup('Expense & Operations', info.expenseOperations)}
              {renderDocGroup('Revenue', info.revenue)}
            </div>
          )}
        </div>

        {/* Footer — Smart Nudge Banner or Simple Close */}
        <div className="h-px bg-black/[0.06]" />
        {totalLaterItems > 0 ? (
          <div className="px-7 py-4">
            <div className="flex items-center justify-between gap-4 bg-amber-50/70 border border-amber-200/50 rounded-xl px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-100/80 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-body text-amber-900/80 font-semibold">
                    {totalLaterItems} pending item{totalLaterItems !== 1 ? 's' : ''} marked &quot;Later&quot;
                  </p>
                  <p className="text-caption text-amber-700/50 mt-0.5 truncate">
                    {laterPortals.length > 0 && `${laterPortals.length} portal${laterPortals.length !== 1 ? 's' : ''}`}
                    {laterPortals.length > 0 && laterDocs.length > 0 && ' · '}
                    {laterDocs.length > 0 && `${laterDocs.length} document${laterDocs.length !== 1 ? 's' : ''}`}
                    {' '}still needed from client
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNudgeOverlay(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-body font-semibold transition-all shadow-sm hover:shadow flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Nudge Client
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-7 py-4">
            <div className="flex items-center gap-2 text-caption text-emerald-600/70">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">All onboarding items complete</span>
            </div>
            <button onClick={onClose} className="px-5 py-2 rounded-xl text-body font-medium text-black/35 hover:text-black/55 hover:bg-black/[0.03] transition-all">
              Close
            </button>
          </div>
        )}
      </div>

      {/* ── Nudge Client Overlay ── */}
      {showNudgeOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => !nudgeSending && setShowNudgeOverlay(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden"
            style={{ animation: 'atBiSlideUp 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success State */}
            {nudgeSent ? (
              <div className="flex flex-col items-center justify-center py-16 px-8" style={{ animation: 'atBiSlideUp 0.25s ease-out' }}>
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-h2 font-bold text-black/85 mb-2">Reminder Sent!</h3>
                <p className="text-body text-black/40 text-center max-w-[320px] leading-relaxed">
                  Your onboarding reminder has been shared to <span className="font-semibold text-black/55">#{clientChannelSlug}</span>
                </p>
              </div>
            ) : (
              <>
                {/* Overlay Header */}
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-h3 font-bold text-black/85">Send Onboarding Reminder</h3>
                        <p className="text-caption text-black/35 mt-0.5">Encourage {info.companyName} to complete their setup</p>
                      </div>
                    </div>
                    <button onClick={() => !nudgeSending && setShowNudgeOverlay(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors" aria-label="Close">
                      <X className="w-4 h-4 text-black/30" />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-black/[0.06]" />

                {/* Overlay Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                  {/* Channel Target */}
                  <div>
                    <label className="text-[11px] font-semibold text-black/40 uppercase tracking-wide block mb-2">Sending to</label>
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-black/[0.02] border border-black/[0.05]">
                      <div className="w-7 h-7 rounded-md bg-[#06B6D4]/10 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-3.5 h-3.5 text-[#06B6D4]" />
                      </div>
                      <span className="text-body text-black/70 font-semibold">{clientChannelSlug}</span>
                      <span className="text-caption text-black/25 ml-1">Client Channel</span>
                      <ExternalLink className="w-3 h-3 text-black/20 ml-auto" />
                    </div>
                  </div>

                  {/* Pending Items Summary */}
                  <div>
                    <label className="text-[11px] font-semibold text-black/40 uppercase tracking-wide block mb-2">Pending items flagged ({totalLaterItems})</label>
                    <div className="space-y-1.5">
                      {laterPortals.map((p, i) => (
                        <div key={`p-${i}`} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60">
                          <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-body text-amber-900/70 font-medium flex-1 min-w-0 truncate">{p.name}</span>
                          <span className="text-[11px] text-amber-600/50 font-medium flex-shrink-0">Portal</span>
                        </div>
                      ))}
                      {laterDocs.map((d, i) => (
                        <div key={`d-${i}`} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60">
                          <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-body text-amber-900/70 font-medium flex-1 min-w-0 truncate">{d.name}</span>
                          <span className="text-[11px] text-amber-600/50 font-medium flex-shrink-0">Document</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold text-black/40 uppercase tracking-wide">Message preview</label>
                      <div className="flex items-center gap-1 text-[11px] text-[#06B6D4]/60 font-medium">
                        <Sparkles className="w-3 h-3" />
                        Auto-generated
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/[0.015] border border-black/[0.05] px-5 py-4">
                      <pre className="text-body text-black/60 leading-relaxed whitespace-pre-wrap font-sans">{generateNudgeMessage()}</pre>
                    </div>
                  </div>
                </div>

                {/* Overlay Footer */}
                <div className="h-px bg-black/[0.06]" />
                <div className="flex items-center justify-between px-6 py-4">
                  <p className="text-caption text-black/25 flex items-center gap-1.5">
                    <MessageSquareText className="w-3.5 h-3.5" />
                    Visible to all channel members
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setShowNudgeOverlay(false)}
                      disabled={nudgeSending}
                      className="px-4 py-2.5 rounded-xl text-body font-medium text-black/35 hover:text-black/55 hover:bg-black/[0.03] transition-all disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendNudge}
                      disabled={nudgeSending}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-body font-semibold transition-all shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {nudgeSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Send to Channel
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`@keyframes atBiSlideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ── Filter Panel Dropdown (matching PM pattern exactly) ──
function ATFilterPanel({
  filters, onChange, onClose, onReset, activeCount,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  onReset: () => void;
  activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] p-0 z-50 w-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-black/60" />
          <span className="text-black/80 text-body font-semibold">Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#204CC7] text-white flex items-center justify-center text-micro font-bold">{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button onClick={onReset} className="px-2 py-1 text-[#204CC7] hover:bg-[#EEF1FB] rounded-lg transition-colors text-micro font-medium">
              Reset all
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-black/[0.04] rounded-lg transition-colors">
            <X className="w-4 h-4 text-black/55" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">STATUS</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Completed', 'In Progress', 'Not Started', 'Overdue'] as ProgressFilter[]).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, status: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-caption font-medium ${
                  filters.status === opt
                    ? opt === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : opt === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${
                  filters.status === opt ? (opt === 'Completed' ? 'bg-emerald-500' : opt === 'Overdue' ? 'bg-rose-500' : 'bg-[#204CC7]') :
                  opt === 'Completed' ? 'bg-emerald-400' :
                  opt === 'In Progress' ? 'bg-amber-400' :
                  opt === 'Not Started' ? 'bg-slate-300' :
                  opt === 'Overdue' ? 'bg-rose-400' : ''
                }`} />}
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">CATEGORY</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'GST', 'TDS', 'Income Tax', 'Bookkeeping', 'Compliance', 'Audit'] as CategoryFilter[]).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, category: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all text-caption font-medium ${
                  filters.category === opt
                    ? 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Team Member */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">TEAM MEMBER</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onChange({ ...filters, team: 'All' })}
              className={`px-3 py-1.5 rounded-lg border transition-all text-caption font-medium ${
                filters.team === 'All'
                  ? 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                  : 'bg-white text-black/60 border-black/10 hover:border-black/20'
              }`}
            >
              All
            </button>
            {TEAM_MEMBERS.map(tm => (
              <button
                key={tm.initials}
                onClick={() => onChange({ ...filters, team: tm.initials })}
                className={`px-3 py-1.5 rounded-lg border transition-all text-caption font-medium ${
                  filters.team === tm.initials
                    ? 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {tm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Kickoff Status */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">KICKOFF</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Pending', 'Onboarding', 'Done'] as (KickoffStatus | 'All')[]).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, kickoff: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-caption font-medium ${
                  filters.kickoff === opt
                    ? opt === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : opt === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : opt === 'Onboarding' ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    : 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${
                  opt === 'Done' ? 'bg-emerald-500' : opt === 'Pending' ? 'bg-amber-500' : 'bg-cyan-500'
                }`} />}
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-black/[0.05] flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-black/10 text-black/60 hover:bg-black/[0.03] transition-all text-caption font-medium">
          Cancel
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#204CC7] text-white hover:bg-[#1a3fa8] transition-all text-caption font-semibold">
          Apply Filters
        </button>
      </div>
    </div>
  );
}

// ── A&T Kickoff Modal Component (team assignment only) ──
function ATKickoffModal({ client, onClose, onComplete }: {
  client: Client;
  onClose: () => void;
  onComplete: (assignments: Record<string, string>) => void;
}) {
  const totalSteps = 2;
  const [step, setStep] = useState(1);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const requiredSlotsFilled = atRoleSlots.filter(s => s.required).every(s => assignments[s.role]);
  const canProceed = step === 1 ? requiredSlotsFilled : true;

  const stepLabels = ['Assign Team', 'Review & Launch'];
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  const renderSlotRow = (slot: { role: string; required: boolean }) => {
    const assigned = assignments[slot.role];
    const assignedEmp = atEmployeePool.find(e => e.id === assigned);
    const isOpen = openDropdown === slot.role;
    const available = atEmployeePool.filter(e => e.role === slot.role && !Object.values(assignments).includes(e.id));
    return (
      <div key={slot.role} className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : slot.role)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`${slot.role}${assignedEmp ? `, assigned to ${assignedEmp.name}` : ', unassigned'}`}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
            assignedEmp
              ? 'border-[#00C875]/30 bg-[#00C875]/[0.04]'
              : isOpen
                ? 'border-[#06B6D4]/30 ring-2 ring-[#06B6D4]/10 bg-white'
                : 'border-black/[0.08] hover:border-black/15 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {assignedEmp ? (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold bg-[#06B6D4]">
                {getInitials(assignedEmp.name)}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-black/[0.04] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-black/25" aria-hidden="true" />
              </div>
            )}
            <div>
              <p className={`text-body font-medium ${assignedEmp ? 'text-black/80' : 'text-black/35'}`}>
                {assignedEmp ? assignedEmp.name : 'Select employee'}
              </p>
              <p className="text-caption text-black/40">
                {slot.role}
                <span className={`ml-1.5 ${slot.required ? 'text-[#E2445C]/60' : 'text-black/25'}`}>
                  {slot.required ? '· Required' : '· Optional'}
                </span>
              </p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-black/25 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-black/[0.08] shadow-lg py-1 max-h-[180px] overflow-y-auto" role="listbox" aria-label={`Employees for ${slot.role}`}>
            {available.length === 0 ? (
              <p className="px-4 py-3 text-caption text-black/35">No available employees for this role</p>
            ) : available.map(emp => (
              <button
                key={emp.id}
                role="option"
                aria-selected={false}
                onClick={() => {
                  setAssignments(prev => ({ ...prev, [slot.role]: emp.id }));
                  setOpenDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-black/[0.06] flex items-center justify-center text-[10px] font-bold text-black/50">
                  {getInitials(emp.name)}
                </div>
                <span className="text-body text-black/70">{emp.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="at-kickoff-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[580px] max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalSlideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4">
          <div>
            <p className="text-caption font-semibold text-[#06B6D4] uppercase tracking-wider mb-1">Client Kickoff</p>
            <h2 id="at-kickoff-modal-title" className="text-h2 text-black/90 leading-tight">{client.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-cyan-50 text-cyan-700">
                Accounts &amp; Taxation
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors" aria-label="Close kickoff modal">
            <X className="w-4 h-4 text-black/40" />
          </button>
        </div>

        {/* ── Step Progress ── */}
        <div className="px-7 pb-5">
          <div className="flex items-center" role="navigation" aria-label="Kickoff steps">
            {stepLabels.map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold transition-all ${
                      isDone ? 'bg-[#00C875] text-white' : isActive ? 'bg-[#06B6D4] text-white' : 'bg-black/[0.06] text-black/35'
                    }`} aria-current={isActive ? 'step' : undefined}>
                      {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : stepNum}
                    </div>
                    <span className={`text-caption font-medium whitespace-nowrap ${isActive ? 'text-black/80' : isDone ? 'text-[#00C875]' : 'text-black/35'}`}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`flex-1 h-px mx-3 ${isDone ? 'bg-[#00C875]' : 'bg-black/[0.08]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-black/[0.06]" />

        {/* ── Step Content ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {/* STEP 1: Assign Team */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-4 h-4 text-[#06B6D4]" aria-hidden="true" />
                  <h3 className="text-h3 text-black/80">Assign Accounts &amp; Taxation Team</h3>
                </div>
                <p className="text-body text-black/45 mb-4 -mt-1">
                  Assign the team responsible for this client&apos;s accounts and tax filings.
                </p>
                <div className="space-y-2">
                  {atRoleSlots.map(slot => renderSlotRow(slot))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Review & Launch */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <CircleCheck className="w-4 h-4 text-[#00C875]" aria-hidden="true" />
                <h3 className="text-h3 text-black/80">Review &amp; Launch Kickoff</h3>
              </div>

              <div className="p-4 rounded-lg bg-black/[0.015] border border-black/[0.05]">
                <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-3">Assigned Team</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(assignments).filter(([, v]) => v).map(([role, empId]) => {
                    const emp = atEmployeePool.find(e => e.id === empId);
                    return emp ? (
                      <div key={role} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-black/[0.06]">
                        <div className="w-5 h-5 rounded-full bg-[#06B6D4] flex items-center justify-center text-white text-[10px] font-bold" aria-hidden="true">
                          {getInitials(emp.name)}
                        </div>
                        <span className="text-caption font-medium text-black/70">{emp.name}</span>
                        <span className="text-caption text-black/30">{role}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="h-px bg-black/[0.06]" />
        <div className="flex items-center justify-between px-7 py-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-body font-medium text-black/50 hover:bg-black/[0.03] transition-colors"
              aria-label="Go back to previous step"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-body font-medium text-black/50 hover:bg-black/[0.03] transition-colors"
            >
              Cancel
            </button>
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed}
              aria-disabled={!canProceed}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold transition-all ${
                canProceed
                  ? 'bg-[#06B6D4] text-white hover:bg-[#0891b2] shadow-sm'
                  : 'bg-black/[0.06] text-black/25 cursor-not-allowed'
              }`}
            >
              Continue
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={() => onComplete(assignments)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold bg-[#00C875] text-white hover:bg-[#00b368] shadow-sm transition-all"
            >
              <CircleCheck className="w-4 h-4" aria-hidden="true" />
              Launch Kickoff
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes modalSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

interface AccountsTaxationProps {
  onBack?: () => void;
}

export function AccountsTaxation({ onBack }: AccountsTaxationProps) {
  const [currentView, setCurrentView] = useState<View>('clientList');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [kickoffClient, setKickoffClient] = useState<Client | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(standardChecklistItems);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<Filters>({ status: 'All', category: 'All', team: 'All', kickoff: 'All' });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [businessInfoClient, setBusinessInfoClient] = useState<Client | null>(null);
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  // ─── Discuss-in-Channel flow state ───
  const [discussOpen, setDiscussOpen] = useState<string | null>(null); // checklist item id with composer open
  const [discussMsg, setDiscussMsg] = useState('');
  const [sentToast, setSentToast] = useState<{ channel: string; particulars: string; work: string; status: string } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const lastDiscussionRef = useRef<{ message: string; particulars: string; work: string; status: string; dueDate: string } | null>(null);

  // Auto-focus composer when opened
  useEffect(() => {
    if (discussOpen) {
      setTimeout(() => composerRef.current?.focus(), 50);
    }
  }, [discussOpen]);

  const getClientChannelId = (clientName: string) => {
    // Derive channel id from client name — matches Inbox channel id format
    return clientName.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSendDiscussion = (item: ChecklistItem) => {
    if (!discussMsg.trim() || !selectedClient) return;
    const channelName = selectedClient.name;
    lastDiscussionRef.current = {
      message: discussMsg.trim(),
      particulars: item.particulars,
      work: item.work,
      status: item.status,
      dueDate: formatDate(parseDate(item.date)),
    };
    setSentToast({ channel: channelName, particulars: item.particulars, work: item.work, status: item.status });
    setDiscussOpen(null);
    setDiscussMsg('');
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setSentToast(null), 5000);
  };

  const handleGoToChannel = () => {
    if (!selectedClient) return;
    const channelId = getClientChannelId(selectedClient.name);
    // Store discussion data in sessionStorage for Inbox to pick up
    if (lastDiscussionRef.current) {
      sessionStorage.setItem('inbox_discussion_msg', JSON.stringify({
        channelId,
        message: lastDiscussionRef.current.message,
        metric: `${lastDiscussionRef.current.particulars} — ${lastDiscussionRef.current.work}`,
        proposed: lastDiscussionRef.current.status,
        client: lastDiscussionRef.current.dueDate,
        finalTarget: lastDiscussionRef.current.status === 'Overdue' ? 'Needs attention' : lastDiscussionRef.current.status,
        sender: 'You',
      }));
    }
    setSentToast(null);
    window.location.href = `/inbox?channel=${channelId}`;
  };

  const activeFilterCount = (filters.status !== 'All' ? 1 : 0) + (filters.category !== 'All' ? 1 : 0) + (filters.team !== 'All' ? 1 : 0) + (filters.kickoff !== 'All' ? 1 : 0);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      if (!client.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filters.status !== 'All') {
        if (filters.status === 'Completed' && client.progress !== 100) return false;
        if (filters.status === 'In Progress' && !(client.progress > 0 && client.progress < 100)) return false;
        if (filters.status === 'Not Started' && client.progress !== 0) return false;
        if (filters.status === 'Overdue' && !client.isOverdue) return false;
      }
      if (filters.category !== 'All' && client.category !== filters.category) return false;
      if (filters.team !== 'All' && !client.team.some(t => t.initials === filters.team)) return false;
      if (filters.kickoff !== 'All' && client.kickoffStatus !== filters.kickoff) return false;
      return true;
    });
  }, [clients, searchQuery, filters]);

  const totalClients = filteredClients.length;
  const completedClients = filteredClients.filter(c => c.progress === 100).length;
  const overdueClients = filteredClients.filter(c => c.isOverdue).length;
  const inProgressClients = filteredClients.filter(c => c.progress > 0 && c.progress < 100 && !c.isOverdue).length;
  const avgProgress = totalClients > 0 ? Math.round(filteredClients.reduce((sum, c) => sum + c.progress, 0) / totalClients) : 0;

  const resetFilters = () => setFilters({ status: 'All', category: 'All', team: 'All', kickoff: 'All' });

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('checklist');
  };

  const handleBackToList = () => {
    setCurrentView('clientList');
    setSelectedClient(null);
  };

  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click (mousedown pattern for React 18)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setOpenStatusDropdown(null);
      }
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setCardMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const STATUS_OPTIONS: ChecklistItem['status'][] = ['Pending', 'In Progress', 'Done', 'Overdue'];

  const STATUS_STYLES: Record<ChecklistItem['status'], { bg: string; border: string; text: string; hoverBg: string; dot: string }> = {
    Pending:       { bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   hoverBg: 'hover:bg-amber-100',   dot: 'bg-amber-400' },
    'In Progress': { bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-700',    hoverBg: 'hover:bg-blue-100',    dot: 'bg-blue-400' },
    Done:          { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100', dot: 'bg-emerald-400' },
    Overdue:       { bg: 'bg-rose-50',    border: 'border-rose-100',    text: 'text-rose-600',    hoverBg: 'hover:bg-rose-100',    dot: 'bg-rose-400' },
  };

  /** Parse YYYY-MM-DD safely (avoids cross-browser Date parsing issues) */
  function parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /** Format a Date to "20 Apr 2026" style */
  function formatDate(d: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** Compute due-date urgency relative to today */
  function getDueDateInfo(dateStr: string, status: ChecklistItem['status']) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseDate(dateStr);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Already done — show completed indicator
    if (status === 'Done') return { label: null, style: '', icon: null, rowHighlight: '' };

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return {
        label: absDays === 1 ? '1 day overdue' : `${absDays} days overdue`,
        style: 'text-white bg-[#E2445C] border-[#E2445C]',
        icon: 'overdue' as const,
        rowHighlight: 'bg-rose-50/60',
      };
    }
    if (diffDays === 0) {
      return {
        label: 'Due today!',
        style: 'text-white bg-[#E2445C] border-[#E2445C]',
        icon: 'today' as const,
        rowHighlight: 'bg-rose-50/40',
      };
    }
    if (diffDays === 1) {
      return {
        label: 'Due tomorrow',
        style: 'text-[#E2445C] bg-rose-50 border-rose-200',
        icon: 'soon' as const,
        rowHighlight: 'bg-rose-50/30',
      };
    }
    if (diffDays <= 3) {
      return {
        label: `Due in ${diffDays} days`,
        style: 'text-amber-800 bg-[#FDAB3D]/15 border-[#FDAB3D]/40',
        icon: 'soon' as const,
        rowHighlight: 'bg-amber-50/30',
      };
    }
    if (diffDays <= 7) {
      return {
        label: `Due in ${diffDays} days`,
        style: 'text-[#204CC7] bg-blue-50 border-blue-200',
        icon: 'upcoming' as const,
        rowHighlight: '',
      };
    }
    if (diffDays <= 14) {
      return {
        label: `${diffDays} days left`,
        style: 'text-black/50 bg-black/[0.03] border-black/[0.06]',
        icon: 'safe' as const,
        rowHighlight: '',
      };
    }
    return { label: null, style: '', icon: null, rowHighlight: '' };
  }

  const changeStatus = (itemId: string, newStatus: ChecklistItem['status']) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );
    setOpenStatusDropdown(null);
  };

  const updateComment = (itemId: string, comment: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, comments: comment } : item
      )
    );
  };

  // ─── CLIENT LIST VIEW ─────────────────────────────────────────
  if (currentView === 'clientList') {
    return (
      <div className="-mx-8 -mt-6">
        {/* ── Sticky Top Header Bar ── */}
        <div className="bg-white border-b border-black/5 sticky -top-6 z-30 px-6">
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Left: Title + Count + Month Nav + Period */}
            <div className="flex items-center gap-4 shrink-0">
              <div>
                <h1 className="text-black/90 text-h2 font-bold">Accounts & Taxation</h1>
                <p className="text-black/50 mt-0.5 text-caption font-normal">
                  {filteredClients.length} of {mockClients.length} clients
                </p>
              </div>
              <div className="w-px h-8 bg-black/8" />
              <MonthNavigator
                monthIdx={selectedMonthIdx}
                year={selectedYear}
                onMonthChange={setSelectedMonthIdx}
                onYearChange={setSelectedYear}
                minYear={2023}
              />
              <PeriodLabel monthIdx={selectedMonthIdx} year={selectedYear} />
            </div>

            {/* Right: Search + Filter + Refresh */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Search */}
              <div className="relative flex items-center w-44">
                <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
                />
              </div>

              {/* Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterPanel(p => !p)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all active:scale-[0.98] text-caption font-medium ${
                    showFilterPanel || activeFilterCount > 0
                      ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]'
                      : 'border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
                {showFilterPanel && (
                  <ATFilterPanel
                    filters={filters}
                    onChange={setFilters}
                    onClose={() => setShowFilterPanel(false)}
                    onReset={resetFilters}
                    activeCount={activeFilterCount}
                  />
                )}
              </div>

              {/* Refresh */}
              <button
                onClick={() => console.log('Refreshing...')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Active Filter Tags ── */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 pb-3 flex-wrap">
              <span className="text-black/55 text-caption font-medium">Active filters:</span>
              {filters.status !== 'All' && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                  filters.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                  filters.status === 'Overdue' ? 'bg-rose-50 text-rose-600' :
                  'bg-[#EEF1FB] text-[#3D5EC7]'
                }`}>
                  <Tag className="w-3 h-3" />
                  {filters.status}
                  <button onClick={() => setFilters(f => ({ ...f, status: 'All' }))} className="hover:bg-black/5 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.category !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF1FB] text-[#3D5EC7] rounded-lg text-caption font-medium">
                  <Tag className="w-3 h-3" />
                  {filters.category}
                  <button onClick={() => setFilters(f => ({ ...f, category: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.team !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-caption font-medium">
                  <Users className="w-3 h-3" />
                  {TEAM_MEMBERS.find(t => t.initials === filters.team)?.name || filters.team}
                  <button onClick={() => setFilters(f => ({ ...f, team: 'All' }))} className="hover:bg-violet-100 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.kickoff !== 'All' && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                  filters.kickoff === 'Pending' ? 'bg-amber-50 text-amber-700' :
                  filters.kickoff === 'Onboarding' ? 'bg-cyan-50 text-cyan-700' :
                  'bg-emerald-50 text-emerald-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    filters.kickoff === 'Pending' ? 'bg-amber-500' :
                    filters.kickoff === 'Onboarding' ? 'bg-cyan-500' :
                    'bg-emerald-500'
                  }`} />
                  Kickoff: {filters.kickoff}
                  <button onClick={() => setFilters(f => ({ ...f, kickoff: 'All' }))} className="hover:bg-black/5 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={resetFilters} className="text-[#204CC7] hover:underline text-caption font-medium">Clear all</button>
            </div>
          )}
        </div>

        {/* ── Client Cards Grid ── */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {filteredClients.map((client) => {
              const isPending = client.kickoffStatus === 'Pending';
              const isOnboarding = client.kickoffStatus === 'Onboarding';
              const done = client.completedItems;
              const overdue = client.isOverdue ? client.totalItems - client.completedItems : 0;
              const pending = client.totalItems - done - overdue;
              return (
                <div
                  key={client.id}
                  onClick={() => !isPending && handleClientClick(client)}
                  className={`bg-white rounded-xl border border-black/[0.06] p-5 relative overflow-hidden group transition-all duration-200 ${
                    isPending ? 'cursor-default' : 'cursor-pointer hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]'
                  }`}
                >
                  {/* Left accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: isPending ? '#FDAB3D' : isOnboarding ? '#06B6D4' : client.progress === 100 ? '#10B981' : client.isOverdue ? '#E11D48' : '#204CC7' }} />

                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isPending ? '#FDAB3D' : isOnboarding ? '#06B6D4' : client.progress === 100 ? '#10B981' : client.isOverdue ? '#E11D48' : '#204CC7' }} />
                      <h3 className={`text-body font-bold text-black/90 truncate transition-colors ${!isPending ? 'group-hover:text-[#204CC7]' : ''}`}>{client.name}</h3>
                      {/* Onboarding badge */}
                      {client.onboardingStatus === 'In Progress' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setBusinessInfoClient(client); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/50 text-amber-600 text-[11px] font-semibold flex-shrink-0 hover:bg-amber-100/60 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Onboarding
                        </button>
                      )}
                      {client.onboardingStatus === 'Complete' && !isPending && (
                        <>
                          <span className="text-caption text-black/40 font-medium flex-shrink-0">·</span>
                          <span className="text-caption text-black/55 font-medium flex-shrink-0">{client.totalItems} items</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-amber-700 text-caption font-medium">
                          Pending
                        </span>
                      ) : isOnboarding ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200/60 text-cyan-700 text-caption font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                          Kickoff
                        </span>
                      ) : null}
                      {/* Context menu */}
                      {client.onboardingStatus !== 'Pending' && (
                        <div className="relative" ref={cardMenuOpen === client.id ? cardMenuRef : undefined}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCardMenuOpen(cardMenuOpen === client.id ? null : client.id); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
                            aria-label="More actions"
                          >
                            <MoreVertical className="w-4 h-4 text-black/30" />
                          </button>
                          {cardMenuOpen === client.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-40 w-[180px]">
                              <button
                                onClick={(e) => { e.stopPropagation(); setCardMenuOpen(null); setBusinessInfoClient(client); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-black/[0.03] transition-colors text-left"
                              >
                                <Building2 className="w-4 h-4 text-[#06B6D4]" />
                                <span className="text-body text-black/70 font-medium">Business Info</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {!isPending && !isOnboarding && client.onboardingStatus === 'Complete' && cardMenuOpen !== client.id && (
                        <ChevronRight className="w-4 h-4 text-black/15 group-hover:text-black/55 group-hover:translate-x-[2px] transition-all" />
                      )}
                    </div>
                  </div>

                  {/* Team / Kickoff CTA */}
                  {isPending ? (
                    <div className="mb-3.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setKickoffClient(client); }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#06B6D4]/[0.08] border border-[#06B6D4]/20 text-[#06B6D4] text-caption font-semibold hover:bg-[#06B6D4]/[0.14] hover:border-[#06B6D4]/30 transition-all"
                        aria-label={`Start kickoff for ${client.name}`}
                      >
                        <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        Start Kickoff
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 mb-3.5">
                      <div className="flex -space-x-1.5">
                        {client.team.slice(0, 5).map((t, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: t.color }} title={t.initials}>
                            {t.initials}
                          </div>
                        ))}
                        {client.team.length > 5 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-black/10 flex items-center justify-center text-black/70 text-[8px] font-bold">
                            +{client.team.length - 5}
                          </div>
                        )}
                      </div>
                      <span className="text-caption text-black/55 font-medium">{client.team.length} member{client.team.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Stats row */}
                  {isPending ? (
                    <div className="flex pt-4 border-t border-black/[0.04]">
                      <p className="text-caption text-black/35 font-medium">Awaiting team assignment to begin</p>
                    </div>
                  ) : (
                    <div className="flex pt-4 border-t border-black/[0.04]">
                      {[
                        { val: overdue, label: 'Overdue', color: 'text-red-600' },
                        { val: pending >= 0 ? pending : 0, label: 'Pending', color: 'text-black/65' },
                        { val: done, label: 'Done', color: 'text-emerald-600' },
                      ].map((s, i) => (
                        <div key={s.label} className={`flex-1 text-center ${i > 0 ? 'border-l border-black/[0.04]' : ''}`}>
                          <div className={`text-h3 font-bold ${s.color}`}>{s.val}</div>
                          <div className="text-black/55 text-caption font-normal mt-[2px]">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-16">
              <p className="text-black/55 text-body font-medium">No clients match the current filters.</p>
              <button onClick={resetFilters} className="mt-2 text-[#204CC7] hover:underline text-caption font-medium">
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* ── A&T Kickoff Modal ── */}
        {kickoffClient && (
          <ATKickoffModal
            client={kickoffClient}
            onClose={() => setKickoffClient(null)}
            onComplete={(assignments) => {
              setClients(prev => prev.map(c => {
                if (c.id !== kickoffClient.id) return c;
                const assignedTeam = Object.entries(assignments)
                  .filter(([, v]) => v)
                  .map(([, empId]) => {
                    const emp = atEmployeePool.find(e => e.id === empId);
                    const initials = emp ? emp.name.split(' ').map(n => n[0]).join('') : '';
                    return { initials, color: '#06B6D4' };
                  });
                return { ...c, kickoffStatus: 'Onboarding' as KickoffStatus, team: assignedTeam };
              }));
              setKickoffClient(null);
            }}
          />
        )}

        {/* ── A&T Business Info Modal ── */}
        {businessInfoClient && (
          <ATBusinessInfoModal
            client={businessInfoClient}
            onClose={() => setBusinessInfoClient(null)}
          />
        )}
      </div>
    );
  }

  // ─── CHECKLIST VIEW ──────────────────────────────────────────────
  if (currentView === 'checklist' && selectedClient) {
    const completedCount = checklistItems.filter(item => item.status === 'Done').length;
    const overdueCount = checklistItems.filter(item => item.status === 'Overdue').length;
    const pendingCount = checklistItems.filter(item => item.status === 'Pending').length;
    const totalCount = checklistItems.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);

    return (
      <div className="-mx-8 -mt-6">
        {/* ── Sticky Top Header Bar ── */}
        <div className="bg-white border-b border-black/5 sticky -top-6 z-30 px-6">
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Left: Back + Title + Month Nav + Period */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={handleBackToList} className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95">
                  <ChevronLeft className="w-5 h-5 text-black/60" />
                </button>
                <div>
                  <h1 className="text-black/90 text-h2 font-bold">{selectedClient.name}</h1>
                  <p className="text-black/50 mt-0.5 text-caption font-normal">
                    {checklistItems.length} items · {checklistItems.filter(i => i.status === 'Done').length} done
                  </p>
                </div>
              </div>
              <div className="w-px h-8 bg-black/8" />
              <MonthNavigator
                monthIdx={selectedMonthIdx}
                year={selectedYear}
                onMonthChange={setSelectedMonthIdx}
                onYearChange={setSelectedYear}
                minYear={2023}
              />
              <PeriodLabel monthIdx={selectedMonthIdx} year={selectedYear} />
            </div>

            {/* Right: Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => console.log('Refreshing...')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Checklist Table ── */}
        <div className="p-6">
          <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <th className="text-left py-3 px-4 text-black/55 text-caption font-semibold uppercase tracking-wide">Particulars</th>
                  <th className="text-left py-3 px-4 text-black/55 text-caption font-semibold uppercase tracking-wide">Work</th>
                  <th className="text-left py-3 px-4 text-black/55 text-caption font-semibold uppercase tracking-wide">Due Date</th>
                  <th className="text-left py-3 px-4 text-black/55 text-caption font-semibold uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-black/55 text-caption font-semibold uppercase tracking-wide">Comments</th>
                  <th className="text-left py-3 px-4 text-black/55 text-caption font-semibold uppercase tracking-wide w-[52px]"></th>
                </tr>
              </thead>
              <tbody>
                {checklistItems.map((item) => {
                  const dueDateInfo = getDueDateInfo(item.date, item.status);
                  const dueDate = parseDate(item.date);
                  const formattedDate = formatDate(dueDate);
                  const isUrgent = dueDateInfo.icon === 'overdue' || dueDateInfo.icon === 'today' || dueDateInfo.icon === 'soon';

                  return (<React.Fragment key={item.id}>
                  <tr className={`border-b border-black/[0.04] transition-colors ${dueDateInfo.rowHighlight || 'hover:bg-black/[0.015]'}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isUrgent && item.status !== 'Done' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E2445C] shrink-0 animate-pulse" />
                        )}
                        <span className="text-black/80 text-caption font-medium">{item.particulars}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-black/65 text-caption font-normal">{item.work}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-caption ${
                          dueDateInfo.icon === 'overdue' || dueDateInfo.icon === 'today'
                            ? 'text-[#E2445C] font-semibold'
                            : dueDateInfo.icon === 'soon'
                            ? 'text-amber-700 font-medium'
                            : 'text-black/55 font-normal'
                        }`}>
                          {formattedDate}
                        </span>
                        {dueDateInfo.label && (
                          <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full border text-[11px] font-semibold leading-tight ${dueDateInfo.style}`}>
                            {(dueDateInfo.icon === 'overdue' || dueDateInfo.icon === 'today') && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {dueDateInfo.icon === 'soon' && (
                              <Clock className="w-3 h-3" />
                            )}
                            {dueDateInfo.icon === 'upcoming' && (
                              <Clock className="w-3 h-3" />
                            )}
                            {dueDateInfo.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative" ref={openStatusDropdown === item.id ? statusDropdownRef : undefined}>
                        <button
                          onClick={() => setOpenStatusDropdown(openStatusDropdown === item.id ? null : item.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-caption font-semibold cursor-pointer ${STATUS_STYLES[item.status].bg} ${STATUS_STYLES[item.status].border} ${STATUS_STYLES[item.status].text} ${STATUS_STYLES[item.status].hoverBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[item.status].dot}`} />
                          {item.status}
                          <ChevronRight className={`w-3 h-3 transition-transform ${openStatusDropdown === item.id ? 'rotate-90' : ''}`} />
                        </button>

                        {openStatusDropdown === item.id && (
                          <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-50 min-w-[150px]">
                            {STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => changeStatus(item.id, opt)}
                                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors text-caption font-medium ${
                                  item.status === opt
                                    ? `${STATUS_STYLES[opt].bg} ${STATUS_STYLES[opt].text} font-semibold`
                                    : 'text-black/70 hover:bg-black/[0.03]'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[opt].dot}`} />
                                {opt}
                                {item.status === opt && (
                                  <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.comments}
                          onChange={(e) => updateComment(item.id, e.target.value)}
                          placeholder="Add comment..."
                          className="flex-1 text-black/65 bg-transparent border-none outline-none placeholder:text-black/25 focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg focus:border focus:border-[#204CC7]/20 transition-all text-caption font-normal"
                        />
                      </div>
                    </td>
                    {/* Discuss action */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => { setDiscussOpen(discussOpen === item.id ? null : item.id); setDiscussMsg(''); }}
                        className={`p-1.5 rounded-lg transition-all ${
                          discussOpen === item.id
                            ? 'bg-[#204CC7]/10 text-[#204CC7]'
                            : 'text-black/25 hover:text-black/50 hover:bg-black/[0.03]'
                        }`}
                        aria-label={`Discuss ${item.particulars} in channel`}
                        title="Discuss in Channel"
                      >
                        <MessageSquareText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {/* ── Inline Composer Row ── */}
                  {discussOpen === item.id && (
                    <tr className="bg-[#204CC7]/[0.02]">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="max-w-[600px]" style={{ animation: 'atComposerSlideIn 0.2s ease-out' }}>
                          {/* Channel header */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <Hash className="w-3.5 h-3.5 text-[#204CC7]" />
                            <span className="text-caption font-semibold text-[#204CC7]">{selectedClient.name}</span>
                          </div>
                          {/* Context card */}
                          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-white border border-black/[0.06]">
                            <div className="flex items-center gap-4 text-caption">
                              <div>
                                <span className="text-black/40 font-medium">Task</span>
                                <p className="text-black/70 font-semibold">{item.particulars}</p>
                              </div>
                              <div className="w-px h-6 bg-black/[0.06]" />
                              <div>
                                <span className="text-black/40 font-medium">Work</span>
                                <p className="text-black/70 font-medium">{item.work}</p>
                              </div>
                              <div className="w-px h-6 bg-black/[0.06]" />
                              <div>
                                <span className="text-black/40 font-medium">Due</span>
                                <p className={`font-medium ${
                                  dueDateInfo.icon === 'overdue' || dueDateInfo.icon === 'today' ? 'text-[#E2445C]' : 'text-black/70'
                                }`}>{formattedDate}</p>
                              </div>
                              <div className="w-px h-6 bg-black/[0.06]" />
                              <div>
                                <span className="text-black/40 font-medium">Status</span>
                                <p className={`font-semibold ${STATUS_STYLES[item.status].text}`}>{item.status}</p>
                              </div>
                            </div>
                          </div>
                          {/* Textarea + Send */}
                          <div className="flex items-end gap-2">
                            <textarea
                              ref={composerRef}
                              value={discussMsg}
                              onChange={(e) => setDiscussMsg(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDiscussion(item); } }}
                              placeholder={`Discuss ${item.particulars.toLowerCase()} with ${selectedClient.name}...`}
                              rows={2}
                              className="flex-1 px-3 py-2 rounded-lg border border-black/[0.08] bg-white text-body text-black/80 placeholder:text-black/30 focus:outline-none focus:border-[#204CC7]/30 focus:ring-1 focus:ring-[#204CC7]/10 resize-none transition-all"
                            />
                            <button
                              onClick={() => handleSendDiscussion(item)}
                              disabled={!discussMsg.trim()}
                              className={`p-2.5 rounded-lg transition-all ${
                                discussMsg.trim()
                                  ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa8] shadow-sm'
                                  : 'bg-black/[0.04] text-black/20 cursor-not-allowed'
                              }`}
                              aria-label="Send discussion message"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>);
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        {/* ── Sent-to-channel toast ── */}
        {sentToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" style={{ animation: 'atToastSlideUp 0.3s ease-out' }}>
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#1a1a2e] text-white shadow-2xl border border-white/[0.06]">
              <div className="w-7 h-7 rounded-full bg-[#00C875]/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#00C875]" />
              </div>
              <div className="min-w-0">
                <p className="text-body font-semibold text-white/95">Sent to #{sentToast.channel}</p>
                <p className="text-caption text-white/50 truncate">{sentToast.particulars} · {sentToast.work}</p>
              </div>
              <button
                onClick={handleGoToChannel}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-caption font-semibold text-[#204CC7] transition-all whitespace-nowrap"
              >
                Go to #{selectedClient?.name} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setSentToast(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-1">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes atComposerSlideIn {
            from { transform: translateY(-6px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes atToastSlideUp {
            from { transform: translate(-50%, 12px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return null;
}