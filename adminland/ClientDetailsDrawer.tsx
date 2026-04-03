'use client';
import { useState } from 'react';
import { X, User, Mail, MapPin, Phone, Calendar, ExternalLink, Building2, Plus, Check, Search, UserPlus, ChevronDown } from 'lucide-react';

interface TeamMember {
  role: string;
  name: string | null;
  required: boolean;
}

interface Client {
  id: string;
  companyName: string;
  ownerName: string;
  email: string;
  contactNumber: string;
  address: string;
  sector: string;
  clientRelationshipStatus: string;
  relationshipStatusChinmay: string;
  onboardingProgress: number;
  onboardingStage: string;
  teamMembers: TeamMember[];
  joinedDate: string;
  kickoffDate: string;
  slaStatus: 'Active' | 'Inactive';
  paymentMethod: string;
  mainServiceHead: string;
  serviceType: string;
  businessValue: number;
  businessModel: string;
  businessSize: string;
  businessCategory: string;
  channel: string;
  logo?: string;
}

interface ClientDetailsDrawerProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCLA: () => void;
}

// Mock employee data
const availableEmployees = [
  // HODs
  { id: '1', name: 'Rajesh Kumar', role: 'HOD', department: 'Performance Marketing' },
  { id: '2', name: 'Meera Nair', role: 'HOD', department: 'Performance Marketing' },
  
  // Managers
  { id: '3', name: 'Priya Sharma', role: 'Manager', department: 'Performance Marketing' },
  { id: '4', name: 'Kavya Iyer', role: 'Manager', department: 'Performance Marketing' },
  { id: '5', name: 'Arjun Mehta', role: 'Manager', department: 'Performance Marketing' },
  
  // Sr. Executives
  { id: '6', name: 'Rohan Desai', role: 'Sr. Executive', department: 'Performance Marketing' },
  { id: '7', name: 'Ishaan Joshi', role: 'Sr. Executive', department: 'Performance Marketing' },
  { id: '8', name: 'Aditya Verma', role: 'Sr. Executive', department: 'Performance Marketing' },
  
  // Jr. Executives
  { id: '9', name: 'Sneha Patel', role: 'Jr. Executive', department: 'Performance Marketing' },
  { id: '10', name: 'Vikram Singh', role: 'Jr. Executive', department: 'Performance Marketing' },
  { id: '11', name: 'Rahul Gupta', role: 'Jr. Executive', department: 'Performance Marketing' },
  
  // Graphic Designers
  { id: '12', name: 'Ananya Reddy', role: 'Graphic Designer', department: 'Performance Marketing' },
  { id: '13', name: 'Karan Malhotra', role: 'Graphic Designer', department: 'Performance Marketing' },
  
  // Video Editors
  { id: '14', name: 'Neha Kapoor', role: 'Video Editor', department: 'Performance Marketing' },
  { id: '15', name: 'Siddharth Shah', role: 'Video Editor', department: 'Performance Marketing' },
  
  // Video Shooters
  { id: '16', name: 'Amit Verma', role: 'Video Shooter', department: 'Performance Marketing' },
  { id: '17', name: 'Divya Nair', role: 'Video Shooter', department: 'Performance Marketing' },
  
  // Motion Graphics
  { id: '18', name: 'Akash Patel', role: 'Motion Graphics', department: 'Performance Marketing' },
  { id: '19', name: 'Riya Sharma', role: 'Motion Graphics', department: 'Performance Marketing' },
];

// Define the 8 required roles for Performance Marketing clients
const performanceMarketingRoles = [
  { role: 'HOD/Sr. Manager', key: 'HOD', required: true },
  { role: 'Manager', key: 'Manager', required: true },
  { role: 'Sr. Executive', key: 'Sr. Executive', required: true },
  { role: 'Jr. Executive', key: 'Jr. Executive', required: true },
  { role: 'Graphic Designer', key: 'Graphic Designer', required: false },
  { role: 'Video Editor', key: 'Video Editor', required: false },
  { role: 'Video Shooter', key: 'Video Shooter', required: false },
  { role: 'Motion Graphics', key: 'Motion Graphics', required: false },
];

export function ClientDetailsDrawer({ client, isOpen, onClose, onAddToCLA }: ClientDetailsDrawerProps) {
  // Initialize team assignments with the 8 performance marketing roles
  const [teamAssignments, setTeamAssignments] = useState<Record<string, string | null>>({
    'HOD': null,
    'Manager': null,
    'Sr. Executive': null,
    'Jr. Executive': null,
    'Graphic Designer': null,
    'Video Editor': null,
    'Video Shooter': null,
    'Motion Graphics': null,
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(client?.teamMembers || []);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!client || !isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleAssignMember = (role: string, employeeName: string) => {
    setTeamAssignments(prev => ({ ...prev, [role]: employeeName }));
    setOpenDropdown(null);
  };

  const handleUnassignMember = (role: string) => {
    setTeamAssignments(prev => ({ ...prev, [role]: null }));
    setOpenDropdown(null);
  };

  const getEmployeesForRole = (roleKey: string) => {
    return availableEmployees.filter(emp => emp.role === roleKey);
  };

  const getAssignedEmployee = (roleKey: string) => {
    const employeeName = teamAssignments[roleKey];
    if (!employeeName) return null;
    return availableEmployees.find(emp => emp.name === employeeName);
  };

  const assignedCount = Object.values(teamAssignments).filter(v => v !== null).length;

  const filteredEmployees = availableEmployees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Enhanced Overlay - Completely cover everything including navigation */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-lg z-[100] transition-all"
        onClick={onClose}
      />
      
      {/* Floating Drawer with margins and rounded corners */}
      <div className="fixed right-4 top-4 bottom-4 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-[101] overflow-hidden">
        <div className="h-full overflow-y-auto">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-black/5 px-8 py-5 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h2 text-black">Client Details</h3>
                <p className="text-caption text-black/55 mt-0.5">Complete client information and team management</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onAddToCLA}
                  className="flex items-center gap-2 px-4 py-2 text-body font-medium text-[#204CC7] bg-[#204CC7]/5 rounded-xl hover:bg-[#204CC7]/10 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Add to CLA</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl hover:bg-black/5 flex items-center justify-center transition-all"
                >
                  <X className="w-4.5 h-4.5 text-black/50" />
                </button>
              </div>
            </div>
          </div>

          {/* Client Header Card */}
          <div className="px-8 pt-6 pb-6">
            <div className="bg-gradient-to-br from-[#F6F7FF] to-white rounded-xl p-6 border border-black/5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#204CC7] to-[#1a3d9f] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#204CC7]/20">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-h2 text-black mb-1">{client.companyName}</h4>
                  <p className="text-body text-black/60 mb-3">{client.sector}</p>
                  <div className="flex items-center gap-2 text-caption text-black/60">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid - Two Columns for Better Space Usage */}
          <div className="px-8 pb-8 space-y-6">
            
            {/* 1. Client Basic Details */}
            <div>
              <h5 className="text-caption font-semibold text-black/55 uppercase tracking-wider mb-4">1. Client Basic Details</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-black/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#204CC7]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#204CC7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-black/55 mb-1">Owner Name</p>
                      <p className="text-body text-black font-medium truncate">{client.ownerName}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-black/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#204CC7]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#204CC7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-black/55 mb-1">Email Address</p>
                      <p className="text-body text-black truncate">{client.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-black/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#204CC7]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[#204CC7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-black/55 mb-1">Contact Number</p>
                      <p className="text-body text-black font-medium">+91 {client.contactNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-black/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#204CC7]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#204CC7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-black/55 mb-1">Sector</p>
                      <p className="text-body text-black font-medium">{client.sector}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Relationship & Onboarding */}
            <div>
              <h5 className="text-caption font-semibold text-black/55 uppercase tracking-wider mb-4">2. Relationship & Onboarding</h5>
              <div className="bg-white rounded-xl border border-black/5 p-6 space-y-5">
                {/* Relationship Status Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100">
                    <p className="text-caption text-emerald-600 font-medium mb-2">Client Relationship Status (Tejas)</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-body font-semibold text-emerald-700">Very Strong</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100">
                    <p className="text-caption text-emerald-600 font-medium mb-2">Relationship Status (Chinmay)</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-body font-semibold text-emerald-700">Very Strong</span>
                    </div>
                  </div>
                </div>

                {/* Onboarding Progress */}
                <div className="pt-4 border-t border-black/5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-caption text-black/55 mb-1">Onboarding Status</p>
                      <span className="inline-flex px-3 py-1 rounded-xl text-caption font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {client.onboardingStage}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-h1 font-bold text-[#204CC7]">{client.onboardingProgress}%</p>
                      <p className="text-caption text-black/55">Complete</p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-black/5 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-[#204CC7] to-[#1a3d9f] rounded-full transition-all duration-700 shadow-sm"
                      style={{ width: `${client.onboardingProgress}%` }}
                    />
                  </div>
                  
                  {/* CTA to Main Onboarding Screen */}
                  <button
                    onClick={() => {
                      // TODO: Navigate to main onboarding screen
                      console.log('Navigate to onboarding screen for client:', client.id);
                    }}
                    className="flex items-center gap-2 text-body font-medium text-[#204CC7] hover:text-[#1a3d9f] transition-all group"
                  >
                    <span>{client.onboardingStage}</span>
                    <div className="w-6 h-6 bg-[#204CC7] rounded-full flex items-center justify-center group-hover:bg-[#1a3d9f] transition-all">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Assigned Team - World-Class Functional */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-caption font-semibold text-black/55 uppercase tracking-wider">3. Assigned Team</h5>
                <span className="text-caption text-black/55">{assignedCount} of {performanceMarketingRoles.length} assigned</span>
              </div>
              <div className="bg-white rounded-xl border border-black/5 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {performanceMarketingRoles.map((roleConfig) => {
                    const assigned = getAssignedEmployee(roleConfig.key);
                    const isOpen = openDropdown === roleConfig.key;
                    const employeesForRole = getEmployeesForRole(roleConfig.key);

                    return (
                      <div key={roleConfig.key} className="relative">
                        {/* Dropdown Button */}
                        <button
                          onClick={() => setOpenDropdown(isOpen ? null : roleConfig.key)}
                          className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                            assigned
                              ? 'bg-gradient-to-br from-[#F6F7FF] to-white border-[#204CC7]/10 hover:border-[#204CC7]/20'
                              : 'bg-black/[0.02] border-black/5 hover:border-black/10 hover:bg-black/[0.04]'
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            assigned
                              ? 'bg-gradient-to-br from-[#204CC7] to-[#1a3d9f] shadow-sm shadow-[#204CC7]/20'
                              : 'bg-black/5'
                          }`}>
                            {assigned ? (
                              <span className="text-white text-caption font-bold">
                                {assigned.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            ) : (
                              <User className="w-4 h-4 text-black/30" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-micro font-semibold text-black/60">{roleConfig.role}</p>
                              {roleConfig.required && !assigned && (
                                <span className="inline-flex px-1 py-0.5 rounded text-micro font-bold bg-orange-100 text-orange-700 uppercase leading-none">
                                  Req
                                </span>
                              )}
                            </div>
                            <p className={`text-caption truncate ${
                              assigned ? 'font-semibold text-black' : 'text-black/55'
                            }`}>
                              {assigned ? assigned.name : 'Not Assigned'}
                            </p>
                          </div>

                          {/* Dropdown Arrow */}
                          <svg
                            className={`w-3.5 h-3.5 text-black/55 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 z-20">
                            <div className="bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                              <div className="max-h-56 overflow-y-auto">
                                {/* Unassign Option */}
                                {assigned && (
                                  <button
                                    onClick={() => handleUnassignMember(roleConfig.key)}
                                    className="w-full flex items-center gap-2.5 p-2.5 hover:bg-red-50 transition-all border-b border-black/5"
                                  >
                                    <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <X className="w-3.5 h-3.5 text-red-600" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <p className="text-caption font-medium text-red-600">Remove</p>
                                    </div>
                                  </button>
                                )}

                                {/* Employee Options */}
                                {employeesForRole.map((employee) => {
                                  const isSelected = assigned?.id === employee.id;
                                  return (
                                    <button
                                      key={employee.id}
                                      onClick={() => handleAssignMember(roleConfig.key, employee.name)}
                                      className={`w-full flex items-center gap-2.5 p-2.5 transition-all ${
                                        isSelected
                                          ? 'bg-[#204CC7]/5'
                                          : 'hover:bg-black/[0.02]'
                                      }`}
                                    >
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        isSelected
                                          ? 'bg-gradient-to-br from-[#204CC7] to-[#1a3d9f]'
                                          : 'bg-black/5'
                                      }`}>
                                        <span className={`text-micro font-bold ${
                                          isSelected ? 'text-white' : 'text-black/60'
                                        }`}>
                                          {employee.name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                      </div>
                                      <div className="flex-1 text-left min-w-0">
                                        <p className={`text-caption font-medium truncate ${
                                          isSelected ? 'text-[#204CC7]' : 'text-black'
                                        }`}>
                                          {employee.name}
                                        </p>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-[#204CC7] flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Service Information */}
            <div>
              <h5 className="text-caption font-semibold text-black/55 uppercase tracking-wider mb-4">4. Service Information</h5>
              <div className="bg-white rounded-xl border border-black/5 p-6">
                <div className="grid grid-cols-3 gap-5 mb-5">
                  <div>
                    <p className="text-caption text-black/55 mb-2">Kickoff Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#204CC7]" />
                      <p className="text-body font-semibold text-black">{formatDate(client.kickoffDate)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-caption text-black/55 mb-2">SLA Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-medium ${
                      client.slaStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${client.slaStatus === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      {client.slaStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-caption text-black/55 mb-2">Payment Method</p>
                    <p className="text-body font-semibold text-black">{client.paymentMethod}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-5 border-t border-black/5">
                  <div>
                    <p className="text-caption text-black/55 mb-2">Main Service Head</p>
                    <p className="text-body font-semibold text-black">{client.mainServiceHead}</p>
                  </div>
                  <div>
                    <p className="text-caption text-black/55 mb-2">Service Type</p>
                    <p className="text-body font-semibold text-black">{client.serviceType}</p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-black/5">
                  <p className="text-caption text-black/55 mb-2">Business Value</p>
                  <p className="text-h1 font-bold text-[#204CC7]">{formatCurrency(client.businessValue)}</p>
                </div>
              </div>
            </div>

            {/* 5. Business Information */}
            <div>
              <h5 className="text-caption font-semibold text-black/55 uppercase tracking-wider mb-4">5. Business Information</h5>
              <div className="bg-white rounded-xl border border-black/5 p-6">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-caption text-black/55 mb-2">Business Model</p>
                    <p className="text-body font-semibold text-black">{client.businessModel}</p>
                  </div>
                  <div>
                    <p className="text-caption text-black/55 mb-2">Business Size</p>
                    <p className="text-body font-semibold text-black">{client.businessSize}</p>
                  </div>
                  <div>
                    <p className="text-caption text-black/55 mb-2">Business Category</p>
                    <p className="text-body font-semibold text-black">{client.businessCategory}</p>
                  </div>
                  <div>
                    <p className="text-caption text-black/55 mb-2">Channel</p>
                    <p className="text-body font-semibold text-black">{client.channel}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* World-Class Employee Assignment Modal */}
      {assigningRole && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-6" onClick={() => setAssigningRole(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-black/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-h2 text-black">Assign Team Member</h3>
                  <p className="text-caption text-black/55 mt-1">Select a team member for <span className="font-medium text-[#204CC7]">{assigningRole}</span></p>
                </div>
                <button
                  onClick={() => setAssigningRole(null)}
                  className="w-9 h-9 rounded-xl hover:bg-black/5 flex items-center justify-center transition-all"
                >
                  <X className="w-4.5 h-4.5 text-black/50" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, role, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7] transition-all"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {/* Unassign Option */}
                {teamMembers.find(m => m.role === assigningRole)?.name && (
                  <button
                    onClick={() => {
                      handleUnassignMember(assigningRole);
                      setAssigningRole(null);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-all">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-body font-semibold text-red-600">Remove Assignment</p>
                      <p className="text-caption text-red-500 mt-0.5">Unassign current team member from this role</p>
                    </div>
                  </button>
                )}

                {/* Available Employees */}
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => {
                    const isAssigned = teamMembers.find(m => m.role === assigningRole)?.name === employee.name;
                    return (
                      <button
                        key={employee.id}
                        onClick={() => handleAssignMember(assigningRole, employee.name)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                          isAssigned
                            ? 'bg-[#204CC7]/5 border-2 border-[#204CC7]/20 shadow-sm'
                            : 'bg-white border border-black/5 hover:bg-black/[0.02] hover:border-black/10'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                          isAssigned
                            ? 'bg-gradient-to-br from-[#204CC7] to-[#1a3d9f] shadow-md shadow-[#204CC7]/20'
                            : 'bg-black/5'
                        }`}>
                          <span className={`text-body font-bold ${
                            isAssigned ? 'text-white' : 'text-black/60'
                          }`}>
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className={`text-body font-semibold truncate ${isAssigned ? 'text-[#204CC7]' : 'text-black'}`}>
                            {employee.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-caption text-black/55">{employee.role}</span>
                            <span className="text-caption text-black/55">•</span>
                            <span className="text-caption text-black/55 truncate">{employee.department}</span>
                          </div>
                        </div>
                        {isAssigned && (
                          <div className="w-6 h-6 bg-[#204CC7] rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <User className="w-12 h-12 text-black/10 mx-auto mb-3" />
                    <p className="text-body text-black/55">No employees found</p>
                    <p className="text-caption text-black/55 mt-1">Try adjusting your search</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}