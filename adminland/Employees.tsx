'use client';
import { useState } from 'react';
import { Users, Search, Plus, X, AlertTriangle, CheckCircle, Clock, Award, TrendingUp, Filter, UserPlus, Building2, User, Briefcase, DollarSign, Home, ChevronDown, Check } from 'lucide-react';

interface Employee {
  id: number;
  code: string;
  name: string;
  email: string;
  role: string;
  joiningDate: string;
  department: string;
  status: 'Confirmed' | 'Probation' | 'Intern';
  workstation: string;
  coreTeam: boolean;
  house: string;
  reportingManager: string;
  monthlySalary: number;
  relationshipTejas: string;
  relationshipHOD: string;
  hrRelationship: string;
  communication: string;
  situationHandling: string;
  businessKnowledge: string;
  techKnowledge: string;
  excelSkill: string;
  isCLA: boolean;
  claReason: string;
  assignedClients: string[];
}

// Available options for dropdowns
const ROLES = [
  'Performance Marketing Specialist',
  'Finance Manager',
  'Intern - Performance Marketing',
  'HOD',
  'Sr. Manager',
  'Manager',
  'Sr. Executive',
  'Jr. Executive',
  'Graphic Designer',
  'Video Editor',
  'Video Shooter',
  'Motion Graphics',
];

const DEPARTMENTS = [
  'Performance Marketing',
  'Finance',
  'Operations',
  'HR',
  'Sales',
  'Design',
  'Development',
];

const STATUSES: ('Confirmed' | 'Probation' | 'Intern')[] = ['Confirmed', 'Probation', 'Intern'];

// Mock clients list
const AVAILABLE_CLIENTS = [
  'Acme Corp',
  'Tech Innovations',
  'Global Exports',
  'Sunrise Retail',
  'FinTech Solutions',
  'Urban Living',
  'Retail Solutions',
  'Media House Inc',
  'Digital Dynamics',
  'Cloud Systems',
  'Smart Solutions',
  'Enterprise Plus',
];

export function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'cla'>('all');
  
  // State for inline editing
  const [openDropdown, setOpenDropdown] = useState<{ id: number; field: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: 1,
      code: 'BRG001',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      role: 'Sr. Manager',
      joiningDate: '15 Mar 2022',
      department: 'Performance Marketing',
      status: 'Confirmed',
      workstation: 'Mumbai HQ',
      coreTeam: true,
      house: 'Savage',
      reportingManager: 'Priya Desai',
      monthlySalary: 85000,
      relationshipTejas: 'Very Strong',
      relationshipHOD: 'Very Strong',
      hrRelationship: 'Very Strong',
      communication: 'Fantastic',
      situationHandling: 'Fantastic',
      businessKnowledge: 'Fantastic',
      techKnowledge: 'Average',
      excelSkill: 'Average',
      isCLA: false,
      claReason: '',
      assignedClients: ['Acme Corp', 'Tech Innovations', 'Global Exports'],
    },
    {
      id: 2,
      code: 'BRG002',
      name: 'Priya Desai',
      email: 'priya.desai@example.com',
      role: 'Sr. Executive',
      joiningDate: '20 Aug 2021',
      department: 'Performance Marketing',
      status: 'Confirmed',
      workstation: 'Mumbai HQ',
      coreTeam: true,
      house: 'Palmer',
      reportingManager: 'Tejas (COO)',
      monthlySalary: 72000,
      relationshipTejas: 'Very Strong',
      relationshipHOD: 'Very Strong',
      hrRelationship: 'Average',
      communication: 'Fantastic',
      situationHandling: 'Fantastic',
      businessKnowledge: 'Average',
      techKnowledge: 'Fantastic',
      excelSkill: 'Fantastic',
      isCLA: false,
      claReason: '',
      assignedClients: ['Sunrise Retail', 'FinTech Solutions'],
    },
    {
      id: 3,
      code: 'BRG003',
      name: 'Amit Patel',
      email: 'amit.patel@example.com',
      role: 'Jr. Executive',
      joiningDate: '10 Jan 2023',
      department: 'Performance Marketing',
      status: 'Probation',
      workstation: 'Remote',
      coreTeam: false,
      house: 'Bahram',
      reportingManager: 'Sneha Kumar',
      monthlySalary: 45000,
      relationshipTejas: 'Average',
      relationshipHOD: 'Average',
      hrRelationship: 'Average',
      communication: 'Average',
      situationHandling: 'Need to improve',
      businessKnowledge: 'Need to improve',
      techKnowledge: 'Average',
      excelSkill: 'Need to improve',
      isCLA: true,
      claReason: 'Consistently missing deadlines and poor quality of work. Lacks initiative and requires constant supervision.',
      assignedClients: ['Urban Living'],
    },
    {
      id: 4,
      code: 'BRG004',
      name: 'Sneha Kumar',
      email: 'sneha.kumar@example.com',
      role: 'Performance Marketing Specialist',
      joiningDate: '01 Jun 2022',
      department: 'Performance Marketing',
      status: 'Confirmed',
      workstation: 'Mumbai HQ',
      coreTeam: true,
      house: 'Wilson',
      reportingManager: 'Tejas (COO)',
      monthlySalary: 68000,
      relationshipTejas: 'Very Strong',
      relationshipHOD: 'Very Strong',
      hrRelationship: 'Very Strong',
      communication: 'Fantastic',
      situationHandling: 'Fantastic',
      businessKnowledge: 'Fantastic',
      techKnowledge: 'Fantastic',
      excelSkill: 'Fantastic',
      isCLA: false,
      claReason: '',
      assignedClients: ['Retail Solutions', 'Media House Inc'],
    },
    {
      id: 5,
      code: 'BRG005',
      name: 'Vikram Mehta',
      email: 'vikram.mehta@example.com',
      role: 'Finance Manager',
      joiningDate: '15 Nov 2020',
      department: 'Finance',
      status: 'Confirmed',
      workstation: 'Mumbai HQ',
      coreTeam: true,
      house: 'Savage',
      reportingManager: 'CFO',
      monthlySalary: 95000,
      relationshipTejas: 'Very Strong',
      relationshipHOD: 'Very Strong',
      hrRelationship: 'Very Strong',
      communication: 'Fantastic',
      situationHandling: 'Fantastic',
      businessKnowledge: 'Fantastic',
      techKnowledge: 'Average',
      excelSkill: 'Fantastic',
      isCLA: false,
      claReason: '',
      assignedClients: [],
    },
    {
      id: 6,
      code: 'BRG006',
      name: 'Karan Singh',
      email: 'karan.singh@example.com',
      role: 'Intern - Performance Marketing',
      joiningDate: '01 Oct 2024',
      department: 'Performance Marketing',
      status: 'Intern',
      workstation: 'Remote',
      coreTeam: false,
      house: 'Wilson',
      reportingManager: 'Sneha Kumar',
      monthlySalary: 15000,
      relationshipTejas: 'Weak',
      relationshipHOD: 'Average',
      hrRelationship: 'Average',
      communication: 'Need to improve',
      situationHandling: 'Need to improve',
      businessKnowledge: 'Need to improve',
      techKnowledge: 'Average',
      excelSkill: 'Need to improve',
      isCLA: false,
      claReason: '',
      assignedClients: [],
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Probation':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Intern':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getSkillColor = (skill: string) => {
    switch (skill) {
      case 'Fantastic':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Average':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Need to improve':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate insights
  const totalEmployees = employees.length;
  const confirmedCount = employees.filter(e => e.status === 'Confirmed').length;
  const probationCount = employees.filter(e => e.status === 'Probation').length;
  const internCount = employees.filter(e => e.status === 'Intern').length;
  const coreTeamCount = employees.filter(e => e.coreTeam).length;
  const claCount = employees.filter(e => e.isCLA).length;

  // Update employee field
  const updateEmployee = (id: number, field: keyof Employee, value: any) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
    setOpenDropdown(null);
  };

  // Add client to employee
  const addClientToEmployee = (id: number, client: string) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, assignedClients: [...emp.assignedClients, client] } : emp
    ));
    setOpenDropdown(null);
  };

  // Remove client from employee
  const removeClientFromEmployee = (id: number, client: string) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, assignedClients: emp.assignedClients.filter(c => c !== client) } : emp
    ));
  };

  const displayedEmployees = activeView === 'cla' 
    ? filteredEmployees.filter(emp => emp.isCLA)
    : filteredEmployees;

  return (
    <div className="space-y-4">
      {/* Minimal Subheader */}
      <div className="flex items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-black/55 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/55 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 border border-black/10 rounded-lg bg-white text-black/70 hover:bg-black/5 transition-all text-caption">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#204CC7] text-white rounded-lg hover:bg-[#1a3d9f] transition-all text-caption">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Employee</span>
          </button>
        </div>
      </div>

      {/* Intelligence Section */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white border border-black/5 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/55 text-caption mb-0.5">Total</p>
              <p className="text-black text-h2 font-medium">{totalEmployees}</p>
            </div>
            <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-black/50" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/55 text-caption mb-0.5">Confirmed</p>
              <p className="text-emerald-600 text-h2 font-medium">{confirmedCount}</p>
            </div>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/55 text-caption mb-0.5">Probation</p>
              <p className="text-amber-600 text-h2 font-medium">{probationCount}</p>
            </div>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/55 text-caption mb-0.5">Interns</p>
              <p className="text-[#204CC7] text-h2 font-medium">{internCount}</p>
            </div>
            <div className="w-8 h-8 bg-[#204CC7]/10 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-[#204CC7]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/55 text-caption mb-0.5">Core Team</p>
              <p className="text-purple-600 text-h2 font-medium">{coreTeamCount}</p>
            </div>
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/55 text-caption mb-0.5">CLA/NTF</p>
              <p className="text-rose-600 text-h2 font-medium">{claCount}</p>
            </div>
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Table */}
      <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5">
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Code</th>
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Employee Name</th>
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Role</th>
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Department</th>
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Joining Date</th>
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Status</th>
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Workstation</th>
                <th className="px-4 py-3 text-left text-black/50 text-caption font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.map((employee, index) => (
                <tr
                  key={employee.id}
                  className={`border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-black/[0.01]'
                  } ${employee.isCLA ? 'border-l-4 border-l-rose-600' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="text-[#204CC7] text-caption font-medium">{employee.code}</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#204CC7] rounded-full flex items-center justify-center">
                        <span className="text-white text-micro font-medium">{employee.name.charAt(0)}</span>
                      </div>
                      <p className="text-black text-body font-medium">{employee.name}</p>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-black/70 text-caption">{employee.role}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-black/70 text-caption">{employee.department}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-black/50 text-caption">{employee.joiningDate}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-micro font-medium border ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-black/70 text-caption">{employee.workstation}</p>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedEmployee(employee)}
                      className="text-[#204CC7] hover:bg-[#204CC7]/10 px-2 py-1 rounded text-caption transition-all"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {displayedEmployees.length === 0 && (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-black/10 mx-auto mb-3" />
            <p className="text-black/55 text-body">No employees found</p>
          </div>
        )}
      </div>

      {/* Employee Detail Drawer */}
      {selectedEmployee && (
        <>
          {/* Enhanced Overlay - Completely cover everything including navigation */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-lg z-[100] transition-all"
            onClick={() => setSelectedEmployee(null)}
          />
          
          {/* Floating Drawer with margins and rounded corners */}
          <div className="fixed right-4 top-4 bottom-4 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-[101] overflow-hidden">
            <div className="h-full overflow-y-auto">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-black/5 px-8 py-5 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 bg-gradient-to-br from-[#204CC7] to-[#1a3d9f] rounded-xl flex items-center justify-center shadow-lg shadow-[#204CC7]/20">
                      <span className="text-white text-h2 font-bold">{selectedEmployee.name.charAt(0)}</span>
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h2 className="text-black text-h2 font-semibold">{selectedEmployee.name}</h2>
                      <p className="text-black/55 text-body">{selectedEmployee.code} • {selectedEmployee.role}</p>
                    </div>
                  </div>
                  
                  {/* Close Button */}
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center hover:bg-black/10 transition-all"
                  >
                    <X className="w-5 h-5 text-black/50" />
                  </button>
                </div>
                
                {/* Status Badges */}
                <div className="flex items-center gap-2 mt-4">
                  <span className={`px-3 py-1.5 rounded-xl text-caption font-medium border ${getStatusColor(selectedEmployee.status)}`}>
                    {selectedEmployee.status}
                  </span>
                  {selectedEmployee.coreTeam && (
                    <span className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-caption font-medium">
                      Core Team
                    </span>
                  )}
                  {selectedEmployee.isCLA && (
                    <span className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-caption font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      CLA/NTF
                    </span>
                  )}
                </div>
              </div>

              {/* Drawer Content */}
              <div className="px-8 py-6 space-y-5">
                {/* Basic Information */}
                <div className="bg-white rounded-xl border border-black/5 p-6">
                  <h3 className="text-black/90 text-body font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-black/55 text-caption mb-1.5">Workstation</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#204CC7]/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-[#204CC7]" />
                        </div>
                        <p className="text-black text-body font-medium">{selectedEmployee.workstation}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-black/55 text-caption mb-1.5">House</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#204CC7]/10 rounded-lg flex items-center justify-center">
                          <Home className="w-4 h-4 text-[#204CC7]" />
                        </div>
                        <p className="text-black text-body font-medium">{selectedEmployee.house}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-black/55 text-caption mb-1.5">Reporting Manager</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#204CC7]/10 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-[#204CC7]" />
                        </div>
                        <p className="text-black text-body font-medium">{selectedEmployee.reportingManager}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-black/55 text-caption mb-1.5">Department</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#204CC7]/10 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-[#204CC7]" />
                        </div>
                        <p className="text-black text-body font-medium">{selectedEmployee.department}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compensation */}
                <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-xl border border-emerald-200/50 p-6">
                  <h3 className="text-black/90 text-body font-semibold mb-3 flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    Compensation
                  </h3>
                  <div>
                    <p className="text-black/55 text-caption mb-1">Monthly Salary</p>
                    <p className="text-emerald-600 text-h1 font-bold">₹{selectedEmployee.monthlySalary.toLocaleString()}</p>
                  </div>
                </div>

                {/* Relationships */}
                <div className="bg-white rounded-xl border border-black/5 p-6">
                  <h3 className="text-black/90 text-body font-semibold mb-4">Relationship Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl">
                      <p className="text-black/70 text-body">Relationship with Tejas</p>
                      <span className={`px-3 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.relationshipTejas)}`}>
                        {selectedEmployee.relationshipTejas}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl">
                      <p className="text-black/70 text-body">Relationship with HOD</p>
                      <span className={`px-3 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.relationshipHOD)}`}>
                        {selectedEmployee.relationshipHOD}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl">
                      <p className="text-black/70 text-body">HR Relationship</p>
                      <span className={`px-3 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.hrRelationship)}`}>
                        {selectedEmployee.hrRelationship}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Core Skills */}
                <div className="bg-white rounded-xl border border-black/5 p-6">
                  <h3 className="text-black/90 text-body font-semibold mb-4">Core Skills</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl">
                      <p className="text-black/70 text-body">Communication</p>
                      <span className={`px-2.5 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.communication)}`}>
                        {selectedEmployee.communication}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl">
                      <p className="text-black/70 text-body">Situation Handling</p>
                      <span className={`px-2.5 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.situationHandling)}`}>
                        {selectedEmployee.situationHandling}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl">
                      <p className="text-black/70 text-body">Business Knowledge</p>
                      <span className={`px-2.5 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.businessKnowledge)}`}>
                        {selectedEmployee.businessKnowledge}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl">
                      <p className="text-black/70 text-body">Tech Knowledge</p>
                      <span className={`px-2.5 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.techKnowledge)}`}>
                        {selectedEmployee.techKnowledge}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl col-span-2">
                      <p className="text-black/70 text-body">Excel Skill</p>
                      <span className={`px-2.5 py-1 rounded-lg text-caption font-medium border ${getSkillColor(selectedEmployee.excelSkill)}`}>
                        {selectedEmployee.excelSkill}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CLA Reason if applicable */}
                {selectedEmployee.isCLA && selectedEmployee.claReason && (
                  <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-200 p-6">
                    <h3 className="text-rose-900 text-body font-semibold mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      </div>
                      CLA/NTF Reason
                    </h3>
                    <p className="text-rose-700 text-body leading-relaxed">{selectedEmployee.claReason}</p>
                  </div>
                )}

                {/* Assigned Clients */}
                {selectedEmployee.assignedClients.length > 0 && (
                  <div className="bg-white rounded-xl border border-black/5 p-6">
                    <h3 className="text-black/90 text-body font-semibold mb-4">Assigned Clients ({selectedEmployee.assignedClients.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.assignedClients.map((client, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-caption font-medium">
                          {client}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}