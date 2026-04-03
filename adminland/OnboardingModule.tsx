'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, CheckCircle2, Circle, Clock, X, ChevronRight, ChevronDown, Building2, Check, Filter, ArrowUpDown, Sparkles, Mic, ArrowRight, Flag, Key, Upload, FileText, CheckCircle } from 'lucide-react';

interface OnboardingClient {
  id: string;
  name: string;
  code: string;
  services: {
    performanceMarketing?: OnboardingProgress;
    accountsTaxation?: OnboardingProgress;
  };
}

interface OnboardingProgress {
  status: 'not-started' | 'in-progress' | 'completed';
  completionPercentage: number;
  sections: OnboardingSection[];
  lastUpdated?: string;
}

interface OnboardingSection {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  subsections?: OnboardingSubSection[];
}

interface OnboardingSubSection {
  id: string;
  title: string;
  completed: boolean;
  fields: OnboardingField[];
}

interface OnboardingField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'url';
  value?: any;
  options?: string[];
  required: boolean;
}

type SortOption = 'name-asc' | 'name-desc' | 'progress-asc' | 'progress-desc' | 'recent';
type StatusFilter = 'all' | 'not-started' | 'in-progress' | 'completed';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  uploadedBy: string;
  type: 'pdf' | 'excel' | 'image' | 'zip';
}

// Mock uploaded files for requirements
const mockUploadedFiles: Record<string, UploadedFile[]> = {
  'audited-financial': [
    { id: 'f1', name: 'Audited_Financial_Statement_FY2024.pdf', size: '2.4 MB', uploadDate: '2 days ago', uploadedBy: 'John Doe', type: 'pdf' },
    { id: 'f2', name: 'Notes_to_Accounts.pdf', size: '1.1 MB', uploadDate: '2 days ago', uploadedBy: 'John Doe', type: 'pdf' },
  ],
  'tally-backup': [
    { id: 'f3', name: 'Tally_Backup_Jan2025.zip', size: '15.7 MB', uploadDate: '1 day ago', uploadedBy: 'Sarah Smith', type: 'zip' },
  ],
  'company-document': [
    { id: 'f4', name: 'Certificate_of_Incorporation.pdf', size: '856 KB', uploadDate: '3 days ago', uploadedBy: 'Admin', type: 'pdf' },
    { id: 'f5', name: 'MOA_AOA.pdf', size: '1.2 MB', uploadDate: '3 days ago', uploadedBy: 'Admin', type: 'pdf' },
  ],
  'bank-statement': [
    { id: 'f6', name: 'HDFC_Statement_Dec2024.pdf', size: '3.2 MB', uploadDate: '1 day ago', uploadedBy: 'Finance Team', type: 'pdf' },
    { id: 'f7', name: 'ICICI_Statement_Dec2024.pdf', size: '2.8 MB', uploadDate: '1 day ago', uploadedBy: 'Finance Team', type: 'pdf' },
  ],
  'sales-data': [
    { id: 'f8', name: 'Sales_Register_Q4_2024.xlsx', size: '4.5 MB', uploadDate: '5 hours ago', uploadedBy: 'Sales Team', type: 'excel' },
  ],
  'gst-portal': [
    { id: 'f9', name: 'GST_Credentials.pdf', size: '124 KB', uploadDate: '4 days ago', uploadedBy: 'Admin', type: 'pdf' },
  ],
  'tally-login': [
    { id: 'f10', name: 'Tally_Access_Details.pdf', size: '89 KB', uploadDate: '3 days ago', uploadedBy: 'IT Team', type: 'pdf' },
  ],
};

// Mock data for clients
const mockClients: OnboardingClient[] = [
  {
    id: '1',
    name: 'Tech Solutions Inc',
    code: 'CLI001',
    services: {
      performanceMarketing: {
        status: 'in-progress',
        completionPercentage: 65,
        lastUpdated: '2 hours ago',
        sections: [
          {
            id: 'general-info',
            title: 'General Information',
            description: 'Basic company information and business details',
            completed: false,
            subsections: [
              {
                id: 'setup-basics',
                title: 'Set up the basics',
                completed: false,
                fields: [
                  { id: 'brand_usps', label: 'About the brand & USPs', type: 'textarea', value: '', required: true },
                  { id: 'brand_objective', label: 'Objective the brand is trying to achieve', type: 'textarea', value: '', required: true },
                  { id: 'brand_guidelines', label: 'Brand Guidelines & links', type: 'textarea', value: '', required: true },
                ]
              },
              {
                id: 'competitor-details',
                title: 'Competitor Details',
                completed: false,
                fields: [
                  { 
                    id: 'competitor_info', 
                    label: 'Share information about your key competitors, their strategies, and market positioning.', 
                    type: 'textarea', 
                    required: true 
                  },
                ]
              },
              {
                id: 'product-info',
                title: 'Product Info',
                completed: false,
                fields: [
                  { id: 'primary_products', label: 'Primary Products/Services', type: 'textarea', required: true },
                  { id: 'pricing_model', label: 'Pricing Model', type: 'select', options: ['Subscription', 'One-time', 'Usage-based', 'Freemium'], required: true },
                  { id: 'usp', label: 'Unique Selling Proposition', type: 'textarea', required: true },
                  { id: 'product_categories', label: 'Product Categories', type: 'multiselect', options: ['Software', 'Hardware', 'Services', 'Consulting'], required: true },
                ]
              },
            ]
          },
          {
            id: 'marketing-goals',
            title: 'Marketing Goals',
            description: 'Define your marketing objectives and KPIs',
            completed: false,
            subsections: [
              {
                id: 'primary-goals',
                title: 'Primary Goals',
                completed: false,
                fields: [
                  { id: 'primary_goal', label: 'Primary Marketing Goal', type: 'select', options: ['Lead Generation', 'Brand Awareness', 'Sales', 'App Downloads'], required: true },
                  { id: 'kpis', label: 'Key Performance Indicators', type: 'multiselect', options: ['CPA', 'ROAS', 'CTR', 'Conversions', 'Revenue'], required: true },
                  { id: 'target_cpa', label: 'Target CPA (₹)', type: 'number', required: false },
                  { id: 'target_roas', label: 'Target ROAS', type: 'number', required: false },
                ]
              },
            ]
          },
          {
            id: 'platform-setup',
            title: 'Platform Setup',
            description: 'Configure your advertising platforms',
            completed: false,
            subsections: [
              {
                id: 'platform-preferences',
                title: 'Platform Preferences',
                completed: false,
                fields: [
                  { id: 'preferred_platforms', label: 'Preferred Advertising Platforms', type: 'multiselect', options: ['Google Ads', 'Facebook Ads', 'LinkedIn Ads', 'Instagram Ads', 'YouTube Ads', 'Twitter Ads'], required: true },
                  { id: 'existing_accounts', label: 'Existing Ad Accounts', type: 'textarea', required: false },
                  { id: 'previous_spend', label: 'Previous Monthly Ad Spend (₹)', type: 'number', required: false },
                ]
              },
            ]
          },
          {
            id: 'account-integration',
            title: 'Account Integration',
            description: 'Connect your advertising and analytics accounts',
            completed: false,
            subsections: [
              {
                id: 'meta-ads-integration',
                title: 'Meta Ads Account',
                completed: false,
                fields: [
                  { id: 'meta_ads_status', label: 'Integration Status', type: 'select', options: ['Pending', 'Integrated', 'Failed'], value: 'Pending', required: true },
                  { id: 'meta_ads_details', label: 'Account Details', type: 'textarea', required: false },
                ]
              },
              {
                id: 'google-ads-integration',
                title: 'Google Ads Account',
                completed: false,
                fields: [
                  { id: 'google_ads_status', label: 'Integration Status', type: 'select', options: ['Pending', 'Integrated', 'Failed'], value: 'Pending', required: true },
                  { id: 'google_ads_details', label: 'Account Details', type: 'textarea', required: false },
                ]
              },
              {
                id: 'shopify-integration',
                title: 'Shopify Account',
                completed: false,
                fields: [
                  { id: 'shopify_status', label: 'Integration Status', type: 'select', options: ['Pending', 'Integrated', 'Failed'], value: 'Pending', required: true },
                  { id: 'shopify_details', label: 'Store URL & Details', type: 'textarea', required: false },
                ]
              },
              {
                id: 'login-credentials',
                title: 'Share Logins Credentials',
                completed: false,
                fields: [
                  { id: 'credentials_shared', label: 'Credentials Status', type: 'select', options: ['Pending', 'Shared', 'Not Required'], value: 'Pending', required: true },
                  { id: 'credentials_notes', label: 'Additional Notes', type: 'textarea', required: false },
                ]
              },
            ]
          },
        ]
      },
      accountsTaxation: {
        status: 'not-started',
        completionPercentage: 0,
        lastUpdated: undefined,
        sections: [
          {
            id: 'company-info',
            title: 'Company Information',
            description: 'Legal and registration details',
            completed: false,
            subsections: [
              {
                id: 'legal-details',
                title: 'Legal Details',
                completed: false,
                fields: [
                  { id: 'legal_name', label: 'Legal Company Name', type: 'text', required: true },
                  { id: 'pan', label: 'PAN Number', type: 'text', required: true },
                  { id: 'gstin', label: 'GSTIN', type: 'text', required: true },
                  { id: 'registered_address', label: 'Registered Address', type: 'textarea', required: true },
                ]
              },
              {
                id: 'business-structure',
                title: 'Business Structure',
                completed: false,
                fields: [
                  { id: 'entity_type', label: 'Entity Type', type: 'select', options: ['Private Limited', 'LLP', 'Partnership', 'Sole Proprietorship'], required: true },
                  { id: 'incorporation_date', label: 'Incorporation Date', type: 'text', required: true },
                  { id: 'cin', label: 'CIN Number', type: 'text', required: false },
                ]
              },
            ]
          },
          {
            id: 'financial',
            title: 'Financial Details',
            description: 'Accounting and financial information',
            completed: false,
            subsections: [
              {
                id: 'financial-info',
                title: 'Financial Info',
                completed: false,
                fields: [
                  { id: 'annual_turnover', label: 'Annual Turnover (₹)', type: 'number', required: true },
                  { id: 'financial_year', label: 'Financial Year', type: 'select', options: ['Apr-Mar', 'Jan-Dec'], required: true },
                  { id: 'accounting_software', label: 'Current Accounting Software', type: 'text', required: false },
                ]
              },
            ]
          },
          {
            id: 'compliance',
            title: 'Compliance Requirements',
            description: 'Tax and compliance setup',
            completed: false,
            subsections: [
              {
                id: 'compliance-setup',
                title: 'Compliance Setup',
                completed: false,
                fields: [
                  { id: 'gst_filing', label: 'GST Filing Frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Annual'], required: true },
                  { id: 'tds_applicable', label: 'TDS Applicable', type: 'select', options: ['Yes', 'No'], required: true },
                  { id: 'audit_required', label: 'Audit Required', type: 'select', options: ['Yes', 'No'], required: true },
                ]
              },
            ]
          },
          {
            id: 'data-access',
            title: 'Data Access',
            description: 'Provide access credentials for various systems',
            completed: false,
            subsections: [
              {
                id: 'gst-portal',
                title: 'GST Portal Login',
                completed: false,
                fields: [
                  { id: 'gst_portal_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'tds-portal',
                title: 'TDS Portal Login',
                completed: false,
                fields: [
                  { id: 'tds_portal_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'itr-login',
                title: 'ITR Login',
                completed: false,
                fields: [
                  { id: 'itr_login_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'pt-cpt-credentials',
                title: 'PT/CPT Credentials [PTEC/PTRC]',
                completed: false,
                fields: [
                  { id: 'pt_cpt_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'einvoice-login',
                title: 'E-invoice Login [Website & Software]',
                completed: false,
                fields: [
                  { id: 'einvoice_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'internal-software',
                title: 'Internal Software Access + Credentials',
                completed: false,
                fields: [
                  { id: 'internal_software_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'tally-login',
                title: "Tally Login ID's",
                completed: false,
                fields: [
                  { id: 'tally_login_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'payment-credentials',
                title: 'Payment Credentials',
                completed: false,
                fields: [
                  { id: 'payment_credentials_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'pos-system',
                title: 'POS System',
                completed: false,
                fields: [
                  { id: 'pos_system_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'payroll-login',
                title: "Payroll Login ID's",
                completed: false,
                fields: [
                  { id: 'payroll_login_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'prepaid-partner',
                title: 'Prepaid Partner Credentials',
                completed: false,
                fields: [
                  { id: 'prepaid_partner_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'cod-payment',
                title: 'COD Payment Credentials',
                completed: false,
                fields: [
                  { id: 'cod_payment_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'ecommerce-portals',
                title: 'Ecommerce Portals Login',
                completed: false,
                fields: [
                  { id: 'ecommerce_portals_status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Not Required'], value: 'Pending', required: true },
                ]
              },
            ]
          },
          {
            id: 'list-of-requirements',
            title: 'List of Requirements',
            description: 'Upload required documents and data',
            completed: false,
            subsections: [
              {
                id: 'audited-financial',
                title: 'Audited Financial Statement',
                completed: false,
                fields: [
                  { id: 'audited_financial_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'tally-backup',
                title: 'Latest Tally Backup',
                completed: false,
                fields: [
                  { id: 'tally_backup_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'company-document',
                title: 'Company/LLP Document',
                completed: false,
                fields: [
                  { id: 'company_document_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'bank-statement',
                title: 'Latest Bank Statement',
                completed: false,
                fields: [
                  { id: 'bank_statement_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'nbfc-loan',
                title: 'NBFC [ Loan re-payment schedule / statement]',
                completed: false,
                fields: [
                  { id: 'nbfc_loan_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'purchase-expenses',
                title: 'Purchase/Expenses data',
                completed: false,
                fields: [
                  { id: 'purchase_expenses_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'credit-card',
                title: 'Credit Card Statement',
                completed: false,
                fields: [
                  { id: 'credit_card_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'reimbursement-data',
                title: 'Reimbursement Data',
                completed: false,
                fields: [
                  { id: 'reimbursement_data_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'salary-register',
                title: 'Salary Register',
                completed: false,
                fields: [
                  { id: 'salary_register_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'past-tds-gst',
                title: 'Past TDS & GST workings',
                completed: false,
                fields: [
                  { id: 'past_tds_gst_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'petty-cash',
                title: 'Petty Cash Register',
                completed: false,
                fields: [
                  { id: 'petty_cash_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
              {
                id: 'sales-data',
                title: 'Sales Data',
                completed: false,
                fields: [
                  { id: 'sales_data_status', label: 'Status', type: 'select', options: ['Pending', 'Uploaded', 'Verified'], value: 'Pending', required: true },
                ]
              },
            ]
          },
        ]
      }
    }
  },
  {
    id: '2',
    name: 'Fashion Trends',
    code: 'CLI002',
    services: {
      performanceMarketing: {
        status: 'completed',
        completionPercentage: 100,
        lastUpdated: '3 days ago',
        sections: []
      }
    }
  },
  {
    id: '3',
    name: 'HealthCare Plus',
    code: 'CLI003',
    services: {
      accountsTaxation: {
        status: 'in-progress',
        completionPercentage: 40,
        lastUpdated: '1 day ago',
        sections: []
      }
    }
  },
  {
    id: '4',
    name: 'Green Energy Corp',
    code: 'CLI004',
    services: {
      performanceMarketing: {
        status: 'not-started',
        completionPercentage: 0,
        sections: []
      },
      accountsTaxation: {
        status: 'not-started',
        completionPercentage: 0,
        sections: []
      }
    }
  },
];

// LocalStorage helpers for recent clients
const RECENT_CLIENTS_KEY = 'brego_recent_onboarding_clients';
const MAX_RECENT_CLIENTS = 5;

function getRecentClients(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_CLIENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentClient(clientId: string) {
  try {
    const recent = getRecentClients();
    const filtered = recent.filter(id => id !== clientId);
    const updated = [clientId, ...filtered].slice(0, MAX_RECENT_CLIENTS);
    localStorage.setItem(RECENT_CLIENTS_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail
  }
}

export function OnboardingModule() {
  const [selectedService, setSelectedService] = useState<'performanceMarketing' | 'accountsTaxation'>('performanceMarketing');
  const [selectedClient, setSelectedClient] = useState<OnboardingClient | null>(mockClients[0]);
  const [selectedSubsection, setSelectedSubsection] = useState<OnboardingSubSection | null>(null);
  const [expandedFieldIndex, setExpandedFieldIndex] = useState<number>(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedRequirement, setSelectedRequirement] = useState<OnboardingSubSection | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(clientSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchTerm]);

  // Get recent clients from localStorage
  const recentClientIds = useMemo(() => getRecentClients(), [showClientDropdown]);

  // Filter, sort, and paginate clients with memoization
  const processedClients = useMemo(() => {
    let result = mockClients;

    // Apply search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(client => 
        client.name.toLowerCase().includes(search) ||
        client.code.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(client => {
        const progress = client.services[selectedService];
        return progress?.status === statusFilter;
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      const progressA = a.services[selectedService];
      const progressB = b.services[selectedService];

      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'progress-asc':
          return (progressA?.completionPercentage || 0) - (progressB?.completionPercentage || 0);
        case 'progress-desc':
          return (progressB?.completionPercentage || 0) - (progressA?.completionPercentage || 0);
        case 'recent':
          const indexA = recentClientIds.indexOf(a.id);
          const indexB = recentClientIds.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        default:
          return 0;
      }
    });

    return result;
  }, [debouncedSearch, statusFilter, sortBy, selectedService, recentClientIds]);

  // Separate recent clients for display
  const { recentClients, otherClients } = useMemo(() => {
    if (sortBy === 'recent' && !debouncedSearch && statusFilter === 'all') {
      const recent = processedClients.filter(c => recentClientIds.includes(c.id));
      const others = processedClients.filter(c => !recentClientIds.includes(c.id));
      return { recentClients: recent, otherClients: others };
    }
    return { recentClients: [], otherClients: processedClients };
  }, [processedClients, recentClientIds, sortBy, debouncedSearch, statusFilter]);

  const allDisplayClients = [...recentClients, ...otherClients];

  // Keyboard navigation
  useEffect(() => {
    if (!showClientDropdown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < allDisplayClients.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allDisplayClients[highlightedIndex]) {
          handleSelectClient(allDisplayClients[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowClientDropdown(false);
        setClientSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClientDropdown, highlightedIndex, allDisplayClients]);

  // Reset highlighted index when clients change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [debouncedSearch, statusFilter, sortBy]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (showClientDropdown && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, showClientDropdown]);

  const handleSelectClient = useCallback((client: OnboardingClient) => {
    setSelectedClient(client);
    setShowClientDropdown(false);
    setClientSearchTerm('');
    addRecentClient(client.id);
  }, []);

  const currentProgress = selectedClient?.services[selectedService];
  const completedSections = currentProgress?.sections.filter(s => s.completed).length || 0;
  const totalSections = currentProgress?.sections.length || 0;

  return (
    <div className="flex-1 overflow-hidden bg-white">
      {/* Subheader */}
      <div className="bg-white border-b border-black/5 px-8 py-2.5">
        <div className="flex items-center justify-between">
          {/* Service Tabs - Left */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedService('performanceMarketing')}
              className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-all ${
                selectedService === 'performanceMarketing'
                  ? 'bg-[#EEF1FB] text-[#204CC7]'
                  : 'bg-black/5 text-black/60 hover:bg-black/10'
              }`}
            >
              Performance Marketing
            </button>
            <button
              onClick={() => setSelectedService('accountsTaxation')}
              className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-all ${
                selectedService === 'accountsTaxation'
                  ? 'bg-[#EEF1FB] text-[#204CC7]'
                  : 'bg-black/5 text-black/60 hover:bg-black/10'
              }`}
            >
              Accounts & Taxation
            </button>
          </div>

          {/* Client Selector Dropdown - Right */}
          <div className="relative">
            <button
              onClick={() => setShowClientDropdown(!showClientDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#F6F7FF] border border-black/10 rounded-lg hover:border-[#204CC7]/30 transition-all min-w-[240px]"
            >
              {selectedClient ? (
                <div className="flex-1 text-left">
                  <p className="text-caption font-semibold text-black">{selectedClient.name}</p>
                  <p className="text-micro text-black/55">{selectedClient.code}</p>
                </div>
              ) : (
                <div className="flex-1 text-left">
                  <p className="text-caption text-black/55">Select a client...</p>
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform ${showClientDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Enhanced Dropdown Menu */}
            {showClientDropdown && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl border border-black/10 shadow-2xl z-50">
                {/* Search & Filters */}
                <div className="p-3 border-b border-black/5 space-y-2">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/55" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by name or code..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#F6F7FF] border border-black/5 rounded-lg text-body text-black placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20"
                      autoFocus
                    />
                  </div>

                  {/* Filter & Sort Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-caption font-medium transition-all ${
                        showFilters || statusFilter !== 'all'
                          ? 'bg-[#EEF1FB] text-[#204CC7]'
                          : 'bg-black/5 text-black/60 hover:bg-black/10'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filter
                    </button>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="flex-1 px-2.5 py-1.5 bg-black/5 border border-black/5 rounded-lg text-caption font-medium text-black/70 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20"
                    >
                      <option value="recent">Recent</option>
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="progress-asc">Progress (Low-High)</option>
                      <option value="progress-desc">Progress (High-Low)</option>
                    </select>
                  </div>

                  {/* Status Filter Pills */}
                  {showFilters && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(['all', 'not-started', 'in-progress', 'completed'] as StatusFilter[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-2.5 py-1 rounded-lg text-caption font-medium transition-all ${
                            statusFilter === status
                              ? 'bg-[#EEF1FB] text-[#204CC7]'
                              : 'bg-black/5 text-black/60 hover:bg-black/10'
                          }`}
                        >
                          {status === 'all' ? 'All' : status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Results Count */}
                  <p className="text-caption text-black/55 pt-1">
                    {allDisplayClients.length} {allDisplayClients.length === 1 ? 'client' : 'clients'} found
                  </p>
                </div>

                {/* Client List with Virtual Scrolling */}
                <div ref={dropdownRef} className="max-h-96 overflow-y-auto p-2">
                  {allDisplayClients.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-10 h-10 text-black/20 mx-auto mb-3" />
                      <p className="text-body font-medium text-black/60 mb-1">No clients found</p>
                      <p className="text-caption text-black/55">Try adjusting your filters</p>
                    </div>
                  ) : (
                    <>
                      {/* Recent Clients Section */}
                      {recentClients.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                            <Sparkles className="w-3 h-3 text-[#204CC7]" />
                            <p className="text-caption font-semibold text-black/60">Recently Accessed</p>
                          </div>
                          {recentClients.map((client, index) => {
                            const progress = client.services[selectedService];
                            const isSelected = selectedClient?.id === client.id;
                            const isHighlighted = highlightedIndex === index;

                            return (
                              <button
                                key={client.id}
                                data-index={index}
                                onClick={() => handleSelectClient(client)}
                                className={`w-full text-left p-3 rounded-xl transition-all mb-1 ${
                                  isSelected
                                    ? 'bg-[#204CC7]/10 border border-[#204CC7]'
                                    : isHighlighted
                                    ? 'bg-[#204CC7]/5 border border-[#204CC7]/30'
                                    : 'hover:bg-black/5 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-body font-semibold text-black truncate">{client.name}</p>
                                    <p className="text-caption text-black/55">{client.code}</p>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-[#204CC7] flex-shrink-0 ml-2" />}
                                </div>
                                {progress && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#204CC7] rounded-full transition-all"
                                        style={{ width: `${progress.completionPercentage}%` }}
                                      />
                                    </div>
                                    <span className="text-caption font-medium text-black/50 flex-shrink-0">{progress.completionPercentage}%</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Other Clients Section */}
                      {otherClients.length > 0 && (
                        <div>
                          {recentClients.length > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                              <p className="text-caption font-semibold text-black/60">All Clients</p>
                            </div>
                          )}
                          {otherClients.map((client, index) => {
                            const actualIndex = index + recentClients.length;
                            const progress = client.services[selectedService];
                            const isSelected = selectedClient?.id === client.id;
                            const isHighlighted = highlightedIndex === actualIndex;

                            return (
                              <button
                                key={client.id}
                                data-index={actualIndex}
                                onClick={() => handleSelectClient(client)}
                                className={`w-full text-left p-3 rounded-xl transition-all mb-1 ${
                                  isSelected
                                    ? 'bg-[#204CC7]/10 border border-[#204CC7]'
                                    : isHighlighted
                                    ? 'bg-[#204CC7]/5 border border-[#204CC7]/30'
                                    : 'hover:bg-black/5 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-body font-semibold text-black truncate">{client.name}</p>
                                    <p className="text-caption text-black/55">{client.code}</p>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-[#204CC7] flex-shrink-0 ml-2" />}
                                </div>
                                {progress && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#204CC7] rounded-full transition-all"
                                        style={{ width: `${progress.completionPercentage}%` }}
                                      />
                                    </div>
                                    <span className="text-caption font-medium text-black/50 flex-shrink-0">{progress.completionPercentage}%</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Keyboard Hints */}
                <div className="border-t border-black/5 px-3 py-2 bg-[#FAFAFA]">
                  <p className="text-micro text-black/55 text-center">
                    Use <kbd className="px-1 py-0.5 bg-white border border-black/10 rounded text-[9px] font-mono">↑</kbd> <kbd className="px-1 py-0.5 bg-white border border-black/10 rounded text-[9px] font-mono">↓</kbd> to navigate, <kbd className="px-1 py-0.5 bg-white border border-black/10 rounded text-[9px] font-mono">Enter</kbd> to select, <kbd className="px-1 py-0.5 bg-white border border-black/10 rounded text-[9px] font-mono">Esc</kbd> to close
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="overflow-y-auto h-[calc(100vh-250px)] bg-[#FAFAFA]">
        {selectedClient && currentProgress ? (
          <div className="max-w-5xl mx-auto p-8">
            {/* Progress Header */}
            <div className="bg-white rounded-xl border border-black/5 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-h3 font-bold text-black">{selectedClient.name}</h2>
                  <p className="text-caption text-black/50 mt-0.5">
                    {selectedService === 'performanceMarketing' ? 'Performance Marketing' : 'Accounts & Taxation'} Onboarding
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-h1 font-bold text-[#204CC7]">{currentProgress.completionPercentage}%</div>
                  <p className="text-micro text-black/50 mt-0.5">{completedSections} of {totalSections} completed</p>
                </div>
              </div>
              
              {/* Overall Progress Bar */}
              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#204CC7] to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${currentProgress.completionPercentage}%` }}
                />
              </div>

              {currentProgress.lastUpdated && (
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3 text-black/55" />
                  <p className="text-micro text-black/55">Last updated {currentProgress.lastUpdated}</p>
                </div>
              )}
            </div>

            {/* Onboarding Sections */}
            {currentProgress.sections && currentProgress.sections.length > 0 ? (
              <div className="space-y-4">
                {currentProgress.sections.map((section) => (
                  <div
                    key={section.id}
                    className="w-full bg-white rounded-xl border border-black/5 p-8"
                  >
                    {/* Section Header */}
                    <div className="mb-6">
                      <h3 className="text-h3 font-semibold text-black mb-1">
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="text-body text-black/55">
                          {section.description}
                        </p>
                      )}
                    </div>

                    {/* Subsections List */}
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="space-y-1">
                        {section.id === 'account-integration' ? (
                          // Special rendering for Account Integration section
                          section.subsections.map((subsection) => {
                            // Get integration status from field value
                            const statusField = subsection.fields.find(f => f.id.includes('_status') || f.id.includes('_shared'));
                            const status = statusField?.value || 'Pending';
                            const descriptionMap: Record<string, string> = {
                              'meta-ads-integration': 'Connect your Meta Ads account',
                              'google-ads-integration': 'Connect your Google Ads account',
                              'shopify-integration': 'Connect your Shopify account',
                              'login-credentials': 'Share your socials'
                            };
                            
                            return (
                              <div
                                key={subsection.id}
                                className="w-full flex items-center gap-3 py-3 px-1 border-b border-black/[0.03] last:border-0"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-body text-black/90">
                                    {subsection.title}
                                  </p>
                                  <p className="text-caption text-black/55 mt-0.5">
                                    {descriptionMap[subsection.id] || ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {status === 'Failed' && <Flag className="w-3.5 h-3.5 text-red-500" />}
                                  <span className={`text-caption ${
                                    status === 'Integrated' || status === 'Shared'
                                      ? 'text-emerald-600'
                                      : status === 'Failed'
                                      ? 'text-red-600'
                                      : 'text-black/55'
                                  }`}>
                                    {status}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : section.id === 'data-access' ? (
                          // Special rendering for Data Access section
                          <div className="space-y-1">
                            {section.subsections.map((subsection) => {
                              const statusField = subsection.fields.find(f => f.id.includes('_status'));
                              const status = statusField?.value || 'Pending';
                              
                              return (
                                <div
                                  key={subsection.id}
                                  onClick={() => setSelectedRequirement(subsection)}
                                  className="flex items-center justify-between py-3 px-1 border-b border-black/[0.03] last:border-0 hover:bg-black/[0.01] cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                                      status === 'Received'
                                        ? 'bg-emerald-500'
                                        : status === 'Not Required'
                                        ? 'bg-black/20'
                                        : 'bg-black/10'
                                    }`} />
                                    <p className="text-body text-black/90">
                                      {subsection.title}
                                    </p>
                                  </div>
                                  <span className={`text-caption flex-shrink-0 ${
                                    status === 'Received'
                                      ? 'text-emerald-600'
                                      : status === 'Not Required'
                                      ? 'text-black/30'
                                      : 'text-black/55'
                                  }`}>
                                    {status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : section.id === 'list-of-requirements' ? (
                          // Special rendering for List of Requirements section
                          <div className="space-y-1">
                            {section.subsections.map((subsection) => {
                              const statusField = subsection.fields.find(f => f.id.includes('_status'));
                              const status = statusField?.value || 'Pending';
                              
                              return (
                                <div
                                  key={subsection.id}
                                  onClick={() => setSelectedRequirement(subsection)}
                                  className="flex items-center justify-between py-3 px-1 border-b border-black/[0.03] last:border-0 hover:bg-black/[0.01] cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                                      status === 'Verified'
                                        ? 'bg-emerald-500'
                                        : status === 'Uploaded'
                                        ? 'bg-blue-500'
                                        : 'bg-black/10'
                                    }`} />
                                    <p className="text-body text-black/90">
                                      {subsection.title}
                                    </p>
                                  </div>
                                  <span className={`text-caption flex-shrink-0 ${
                                    status === 'Verified'
                                      ? 'text-emerald-600'
                                      : status === 'Uploaded'
                                      ? 'text-blue-600'
                                      : 'text-black/55'
                                  }`}>
                                    {status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Normal clickable subsections for other sections
                          section.subsections.map((subsection) => (
                            <button
                              key={subsection.id}
                              onClick={() => setSelectedSubsection(subsection)}
                              className="w-full flex items-center gap-3 py-3 px-1 hover:bg-black/[0.01] transition-colors group text-left border-b border-black/[0.03] last:border-0"
                            >
                              <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                                subsection.completed ? 'bg-emerald-500' : 'bg-black/10'
                              }`} />
                              <span className="text-body text-black/90 group-hover:text-black transition-colors">
                                {subsection.title}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-black/5 p-12 text-center">
                <Building2 className="w-12 h-12 text-black/20 mx-auto mb-4" />
                <p className="text-body text-black/55">No onboarding sections configured</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Building2 className="w-16 h-16 text-black/20 mx-auto mb-4" />
              <h3 className="text-h2 font-semibold text-black/90 mb-2">No Client Selected</h3>
              <p className="text-body text-black/55">
                {selectedClient 
                  ? 'This client hasn\'t been onboarded for this service yet' 
                  : 'Select a client from the dropdown to view their onboarding progress'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Drawer for Section Details */}
      {selectedSubsection && selectedClient && (() => {
        const completedFields = selectedSubsection.fields.filter(f => f.value && f.value !== '').length;
        const totalFields = selectedSubsection.fields.length;
        
        // Find next subsection for "Up next" footer
        const currentSectionIndex = currentProgress?.sections.findIndex(s => 
          s.subsections?.some(sub => sub.id === selectedSubsection.id)
        );
        const currentSection = currentProgress?.sections[currentSectionIndex!];
        const currentSubsectionIndex = currentSection?.subsections?.findIndex(sub => sub.id === selectedSubsection.id) || 0;
        const nextSubsection = currentSection?.subsections?.[currentSubsectionIndex + 1];
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => {
                setSelectedSubsection(null);
                setExpandedFieldIndex(0);
              }}
            />
            
            {/* Drawer Panel - Slides from Right */}
            <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="bg-white px-6 py-4 border-b border-black/5 flex items-center justify-between">
                <h2 className="text-h2 font-bold text-black">{selectedSubsection.title}</h2>
                <button
                  onClick={() => {
                    setSelectedSubsection(null);
                    setExpandedFieldIndex(0);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-black/50" />
                </button>
              </div>

              {/* Subtitle & Progress */}
              <div className="bg-white px-6 py-3 border-b border-black/5">
                <p className="text-body text-black/60 mb-1">Help us to know more about your business</p>
                <p className="text-caption text-black/55">{completedFields} of {totalFields} complete (About 5 mins total)</p>
              </div>

              {/* Accordion Content */}
              <div className="flex-1 overflow-y-auto bg-[#FAFAFA] px-6 py-5 space-y-3">
                {selectedSubsection.fields.length === 1 ? (
                  // Single Field Layout (like Competitor Details)
                  selectedSubsection.fields.map((field) => {
                    const fieldValue = fieldValues[field.id] || field.value || '';
                    
                    return (
                      <div key={field.id} className="space-y-3">
                        {/* Information Box */}
                        <div className="bg-[#EEF2FF] rounded-xl px-4 py-3 border border-[#204CC7]/10">
                          <p className="text-body text-black/70 leading-relaxed">{field.label}</p>
                        </div>

                        {/* Text Area */}
                        <div className="bg-white rounded-xl border border-black/5 overflow-hidden shadow-sm">
                          <div className="relative p-4">
                            <textarea
                              value={fieldValue}
                              onChange={(e) => setFieldValues({ ...fieldValues, [field.id]: e.target.value })}
                              placeholder="Describe your competitors, their strengths, weaknesses, and how you differentiate..."
                              rows={10}
                              className="w-full px-0 py-0 bg-transparent border-0 text-body text-black placeholder:text-black/30 focus:outline-none resize-none"
                            />
                            <button
                              onClick={() => {
                                setIsRecording(!isRecording);
                                // Speech-to-text functionality would go here
                              }}
                              className={`absolute right-4 bottom-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                isRecording 
                                  ? 'bg-red-500 text-white' 
                                  : 'bg-[#204CC7] text-white hover:bg-[#1a3da0]'
                              }`}
                              title="Voice input"
                            >
                              <Mic className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              // Save logic here
                              console.log('Saving:', field.id, fieldValue);
                            }}
                            className="px-6 py-2.5 bg-[#204CC7] text-white text-body font-semibold rounded-lg hover:bg-[#1a3da0] transition-colors shadow-sm"
                          >
                            Save & Continue
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Multi-Field Accordion Layout (like Setup Basics)
                  selectedSubsection.fields.map((field, index) => {
                    const isExpanded = expandedFieldIndex === index;
                    const fieldValue = fieldValues[field.id] || field.value || '';
                    
                    return (
                      <div key={field.id} className="bg-white rounded-xl border border-black/5 overflow-hidden shadow-sm">
                        {/* Accordion Header */}
                        <button
                          onClick={() => setExpandedFieldIndex(isExpanded ? -1 : index)}
                          className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-black/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#204CC7]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-black/30" />
                            )}
                            <span className="text-body font-semibold text-[#204CC7]">{field.label}</span>
                          </div>
                          {fieldValue && !isExpanded && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </button>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-white border-t border-black/5">
                            <div className="relative mt-3">
                              <textarea
                                value={fieldValue}
                                onChange={(e) => setFieldValues({ ...fieldValues, [field.id]: e.target.value })}
                                placeholder="Start typing or use voice input..."
                                rows={8}
                                className="w-full px-4 py-3 pr-16 bg-[#FAFAFA] border border-black/5 rounded-lg text-body text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 resize-none"
                              />
                              <button
                                onClick={() => {
                                  setIsRecording(!isRecording);
                                  // Speech-to-text functionality would go here
                                }}
                                className={`absolute right-4 bottom-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                  isRecording 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-[#204CC7] text-white hover:bg-[#1a3da0]'
                                }`}
                                title="Voice input"
                              >
                                <Mic className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                              <p className="text-caption text-black/55">{fieldValue.length} characters</p>
                              <button
                                onClick={() => {
                                  // Save logic here
                                  console.log('Saving:', field.id, fieldValue);
                                  // Auto-expand next field
                                  if (index < selectedSubsection.fields.length - 1) {
                                    setExpandedFieldIndex(index + 1);
                                  }
                                }}
                                className="px-5 py-2 bg-[#204CC7] text-white text-body font-semibold rounded-lg hover:bg-[#1a3da0] transition-colors shadow-sm"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer - Up Next */}
              {nextSubsection && (
                <div className="bg-white border-t border-black/5 px-6 py-4">
                  <button
                    onClick={() => {
                      setSelectedSubsection(nextSubsection);
                      setExpandedFieldIndex(0);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-[#204CC7] font-semibold text-body hover:text-[#1a3da0] transition-colors"
                  >
                    <span>Up next: {nextSubsection.title}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Requirement Files Drawer */}
      {selectedRequirement && selectedClient && (() => {
        const statusField = selectedRequirement.fields.find(f => f.id.includes('_status'));
        const currentStatus = statusField?.value || 'Pending';
        const uploadedFiles = mockUploadedFiles[selectedRequirement.id] || [];
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setSelectedRequirement(null)}
            />
            
            {/* Drawer Panel */}
            <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-[#F6F7FF]">
                <div className="flex-1 min-w-0">
                  <h2 className="text-h2 font-semibold text-black mb-1">
                    {selectedRequirement.title}
                  </h2>
                  <p className="text-body text-black/50">
                    {selectedClient.name} • {selectedClient.code}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequirement(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors flex-shrink-0 ml-4"
                >
                  <X className="w-5 h-5 text-black/60" />
                </button>
              </div>

              {/* Status Bar */}
              <div className="px-8 py-4 bg-white border-b border-black/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-body text-black/60">Status:</span>
                    <span className={`px-3 py-1 rounded-lg text-caption font-medium ${
                      currentStatus === 'Verified' || currentStatus === 'Received'
                        ? 'bg-emerald-50 text-emerald-700'
                        : currentStatus === 'Uploaded'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}>
                      {currentStatus}
                    </span>
                  </div>
                  <button className="px-4 py-2 bg-[#204CC7] text-white text-body font-medium rounded-lg hover:bg-[#1a3da0] transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload New File
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-body font-semibold text-black">
                        Uploaded Files ({uploadedFiles.length})
                      </h3>
                    </div>
                    
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-black/5 hover:border-[#204CC7]/20 hover:bg-[#204CC7]/[0.02] transition-all group"
                      >
                        {/* File Icon */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          file.type === 'pdf' 
                            ? 'bg-red-50 text-red-600' 
                            : file.type === 'excel'
                            ? 'bg-green-50 text-green-600'
                            : file.type === 'image'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-purple-50 text-purple-600'
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        
                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-medium text-black truncate mb-0.5">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-3 text-caption text-black/55">
                            <span>{file.size}</span>
                            <span>•</span>
                            <span>Uploaded {file.uploadDate}</span>
                            <span>•</span>
                            <span>{file.uploadedBy}</span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="px-3 py-1.5 text-caption font-medium text-[#204CC7] hover:bg-[#204CC7]/10 rounded-lg transition-colors">
                            View
                          </button>
                          <button className="px-3 py-1.5 text-caption font-medium text-black/60 hover:bg-black/5 rounded-lg transition-colors">
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-xl bg-black/5 flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-black/20" />
                    </div>
                    <h3 className="text-h3 font-semibold text-black/90 mb-1">
                      No files uploaded yet
                    </h3>
                    <p className="text-body text-black/55 mb-6 max-w-sm">
                      Upload the required documents to complete this requirement
                    </p>
                    <button className="px-6 py-2.5 bg-[#204CC7] text-white text-body font-medium rounded-lg hover:bg-[#1a3da0] transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Files
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {uploadedFiles.length > 0 && (
                <div className="px-8 py-4 border-t border-black/5 bg-[#F6F7FF]">
                  <div className="flex items-center justify-between">
                    <div className="text-body text-black/60">
                      Last updated {uploadedFiles[0]?.uploadDate || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 text-body font-medium text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition-colors">
                        Mark as Verified
                      </button>
                      <button className="px-4 py-2 bg-[#204CC7] text-white text-body font-medium rounded-lg hover:bg-[#1a3da0] transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Click outside to close dropdown */}
      {showClientDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowClientDropdown(false);
            setClientSearchTerm('');
            setShowFilters(false);
          }}
        />
      )}
    </div>
  );
}