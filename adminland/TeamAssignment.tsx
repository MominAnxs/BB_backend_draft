'use client';
import { useState } from 'react';
import { X, Search, UserPlus, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
}

interface TeamRole {
  role: string;
  required: boolean;
  assignedMember: TeamMember | null;
}

interface TeamAssignmentProps {
  clientName: string;
  serviceType: string;
  teamRoles: TeamRole[];
  onClose: () => void;
  onSave: (updatedRoles: TeamRole[]) => void;
}

export function TeamAssignment({ clientName, serviceType, teamRoles, onClose, onSave }: TeamAssignmentProps) {
  const [roles, setRoles] = useState<TeamRole[]>(teamRoles);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock employee database - Replace with actual data
  const availableEmployees: TeamMember[] = [
    { id: '1', name: 'Rahul Sharma', role: 'HOD/Sr. Manager', department: serviceType },
    { id: '2', name: 'Priya Verma', role: 'HOD/Sr. Manager', department: serviceType },
    { id: '3', name: 'Arjun Patel', role: 'Manager', department: serviceType },
    { id: '4', name: 'Sneha Reddy', role: 'Manager', department: serviceType },
    { id: '5', name: 'Vikram Singh', role: 'Sr. Executive', department: serviceType },
    { id: '6', name: 'Anjali Mehta', role: 'Sr. Executive', department: serviceType },
    { id: '7', name: 'Rohan Kumar', role: 'Jr. Executive', department: serviceType },
    { id: '8', name: 'Kavya Iyer', role: 'Jr. Executive', department: serviceType },
    { id: '9', name: 'Aditya Desai', role: 'Graphic Designer', department: 'Performance Marketing' },
    { id: '10', name: 'Meera Shah', role: 'Graphic Designer', department: 'Performance Marketing' },
    { id: '11', name: 'Karthik Nair', role: 'Video Editor', department: 'Performance Marketing' },
    { id: '12', name: 'Divya Kapoor', role: 'Video Editor', department: 'Performance Marketing' },
    { id: '13', name: 'Siddharth Rao', role: 'Video Shooter', department: 'Performance Marketing' },
    { id: '14', name: 'Pooja Gupta', role: 'Video Shooter', department: 'Performance Marketing' },
    { id: '15', name: 'Nikhil Joshi', role: 'Motion Graphics', department: 'Performance Marketing' },
    { id: '16', name: 'Riya Malhotra', role: 'Motion Graphics', department: 'Performance Marketing' },
  ];

  // Filter employees based on selected role
  const getFilteredEmployees = (roleToFilter: string) => {
    return availableEmployees.filter(emp => {
      const matchesRole = emp.role === roleToFilter;
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = emp.department === serviceType || emp.department === 'Performance Marketing';
      return matchesRole && matchesSearch && matchesDepartment;
    });
  };

  const handleAssignMember = (roleIndex: number, member: TeamMember) => {
    const updatedRoles = [...roles];
    updatedRoles[roleIndex].assignedMember = member;
    setRoles(updatedRoles);
    setSelectedRole(null);
    setSearchQuery('');
  };

  const handleRemoveMember = (roleIndex: number) => {
    const updatedRoles = [...roles];
    updatedRoles[roleIndex].assignedMember = null;
    setRoles(updatedRoles);
  };

  const handleSave = () => {
    onSave(roles);
    onClose();
  };

  const assignedCount = roles.filter(r => r.assignedMember !== null).length;
  const totalRoles = roles.length;
  const requiredCount = roles.filter(r => r.required).length;
  const requiredFilled = roles.filter(r => r.required && r.assignedMember !== null).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[#272727]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl transform transition-transform">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#204CC7] to-[#4D73D9] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white">Team Assignment</h2>
                <p className="text-white/80 text-body">Assign team members to {clientName}</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Progress Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-white/70 text-caption mb-1">Total Assigned</p>
                <p className="text-white text-h1">{assignedCount}/{totalRoles}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-white/70 text-caption mb-1">Required Roles</p>
                <p className="text-white text-h1">{requiredFilled}/{requiredCount}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-white/70 text-caption mb-1">Service Type</p>
                <p className="text-white text-body truncate">{serviceType}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {roles.map((roleData, index) => {
                const isSelected = selectedRole === roleData.role;
                const filteredEmployees = getFilteredEmployees(roleData.role);

                return (
                  <div key={index} className="bg-white rounded-xl border border-[#204CC7]/10 overflow-hidden">
                    {/* Role Header */}
                    <div className="bg-[#F6F7FF] px-4 py-3 border-b border-[#204CC7]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            roleData.assignedMember 
                              ? 'bg-[#10B981] text-white' 
                              : roleData.required 
                                ? 'bg-[#F59E0B] text-white' 
                                : 'bg-[#5A5A6F] text-white'
                          }`}>
                            {roleData.assignedMember ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : roleData.required ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-[#272727]">{roleData.role}</h4>
                            <p className="text-[#5A5A6F] text-caption">
                              {roleData.required ? 'Required Role' : 'Optional Role'}
                            </p>
                          </div>
                        </div>
                        {roleData.assignedMember ? (
                          <span className="text-[#10B981] text-caption flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Assigned
                          </span>
                        ) : (
                          <span className="text-[#5A5A6F] text-caption">Not Assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Assigned Member or Assignment UI */}
                    <div className="p-4">
                      {roleData.assignedMember ? (
                        // Show assigned member
                        <div className="flex items-center justify-between p-3 bg-[#E2FFE2] border border-[#10B981]/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-white">
                              {roleData.assignedMember.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[#272727]">{roleData.assignedMember.name}</p>
                              <p className="text-[#5A5A6F] text-caption">{roleData.assignedMember.role}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(index)}
                            className="px-3 py-1 text-[#E85D4D] hover:bg-[#FDD7D0] rounded-lg transition-all text-body"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        // Show assignment interface
                        <div>
                          {!isSelected ? (
                            <button
                              onClick={() => setSelectedRole(roleData.role)}
                              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[#204CC7]/30 rounded-lg text-[#204CC7] hover:bg-[#F6F7FF] transition-all"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Assign Member</span>
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {/* Search */}
                              <div className="relative">
                                <Search className="w-4 h-4 text-[#5A5A6F] absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder={`Search ${roleData.role}...`}
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-[#204CC7]/20 rounded-lg bg-[#F6F7FF] text-[#272727] placeholder:text-[#5A5A6F] focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all text-body"
                                />
                              </div>

                              {/* Employee List */}
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {filteredEmployees.length > 0 ? (
                                  filteredEmployees.map((employee) => (
                                    <button
                                      key={employee.id}
                                      onClick={() => handleAssignMember(index, employee)}
                                      className="w-full flex items-center gap-3 p-3 bg-white border border-[#204CC7]/10 rounded-lg hover:bg-[#F6F7FF] hover:border-[#204CC7]/30 transition-all text-left"
                                    >
                                      <div className="w-8 h-8 bg-gradient-to-br from-[#204CC7] to-[#4D73D9] rounded-full flex items-center justify-center text-white text-body">
                                        {employee.name.charAt(0)}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-[#272727] text-body">{employee.name}</p>
                                        <p className="text-[#5A5A6F] text-caption">{employee.department}</p>
                                      </div>
                                      <UserPlus className="w-4 h-4 text-[#204CC7]" />
                                    </button>
                                  ))
                                ) : (
                                  <div className="text-center py-8 text-[#5A5A6F]">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-body">No employees found</p>
                                  </div>
                                )}
                              </div>

                              {/* Cancel */}
                              <button
                                onClick={() => {
                                  setSelectedRole(null);
                                  setSearchQuery('');
                                }}
                                className="w-full px-3 py-2 border border-[#204CC7]/20 text-[#5A5A6F] rounded-lg hover:bg-[#F6F7FF] transition-all text-body"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#204CC7]/10 bg-[#F6F7FF]">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-[#204CC7]/20 text-[#272727] rounded-lg hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={requiredFilled < requiredCount}
                className={`flex-1 px-4 py-3 rounded-lg transition-all ${
                  requiredFilled < requiredCount
                    ? 'bg-[#5A5A6F] text-white cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-[#204CC7] to-[#4D73D9] text-white hover:shadow-lg hover:shadow-[#204CC7]/25'
                }`}
              >
                {requiredFilled < requiredCount 
                  ? `Assign Required Roles (${requiredFilled}/${requiredCount})`
                  : 'Save Team Assignment'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
