"use client";

import { useState } from 'react';
import { LayoutGrid, BarChart3, FileText, CheckSquare, Info, ChevronRight, Calendar, AlertCircle, MoreVertical } from 'lucide-react';
import Link from 'next/link';

const mockAccountsTaxationData = [
  { id: '1', clientName: 'Afroz', progress: 33 },
  { id: '2', clientName: 'Anil', progress: 33 },
  { id: '3', clientName: 'Jinali', progress: 33 },
  { id: '4', clientName: 'Suman', progress: 27 },
  { id: '5', clientName: 'Tech Solutions Inc', progress: 45 },
  { id: '6', clientName: 'Global Retail Co', progress: 89 },
];

const mockPerformanceMarketingData = [
  { id: '1', clientName: '99 Pancakes', totalItems: 40, ideation: 38, creation: 1, approved: 1 },
  { id: '2', clientName: 'Anaya College', totalItems: 22, ideation: 20, creation: 1, approved: 1 },
  { id: '3', clientName: 'Alpine Group', totalItems: 22, ideation: 14, creation: 5, approved: 2 },
  { id: '4', clientName: 'Fashion Hub Online', totalItems: 35, ideation: 28, creation: 4, approved: 3 },
];

const mockOpenTasks = [
  { id: '1', title: 'Complete Onboarding', dueDate: 'Tue, 11 Feb' },
  { id: '2', title: 'Productise Brego Business', dueDate: 'Tue, 11 Feb' },
  { id: '3', title: 'Productise Brego Business', dueDate: 'Tue, 11 Feb' },
  { id: '4', title: 'Productise Brego Business', dueDate: 'Tue, 11 Feb' },
  { id: '5', title: 'Review Q4 Financials', dueDate: 'Wed, 12 Feb' },
  { id: '6', title: 'Client Strategy Meeting', dueDate: 'Thu, 13 Feb' },
];

export function WorkspaceOverview() {
  const [showClientMenu, setShowClientMenu] = useState<string | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto p-6">
      {/* Overview Header */}
      <div className="mb-6">
        <h1 className="text-h1 text-black/90 mb-1">Workspace Overview</h1>
        <p className="text-body text-black/65">Track all activities across services and clients</p>
      </div>

      {/* Activity Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-black/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-black/55 mb-1">Active Clients</p>
              <p className="text-h2 text-black/90">187</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#204CC7]/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-[#204CC7]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-black/55 mb-1">In Progress</p>
              <p className="text-h2 text-orange-600">42</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-black/55 mb-1">Pending Reviews</p>
              <p className="text-h2 text-blue-600">28</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-black/55 mb-1">Overdue Items</p>
              <p className="text-h2 text-rose-600">7</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Three Column Grid */}
      <div className="grid grid-cols-3 gap-5">
        {/* Accounts & Taxation Widget */}
        <div className="bg-white rounded-xl border border-black/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-body font-semibold text-black/90">Accounts & taxation</h3>
              <button className="text-black/30 hover:text-black/60 transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <Link
              href="/workspace/accounts-taxation"
              className="text-caption font-medium text-[#204CC7] hover:text-[#204CC7]/80 transition-colors px-2.5 py-1 rounded-lg hover:bg-[#204CC7]/5"
            >
              See All
            </Link>
          </div>
          <p className="text-caption text-black/55 mb-4">Checklist</p>
          <div className="space-y-3">
            {mockAccountsTaxationData.slice(0, 4).map((client) => (
              <div key={client.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-medium text-black/80">{client.clientName}</span>
                  <span className="text-caption font-medium text-[#204CC7] bg-[#204CC7]/10 px-2 py-0.5 rounded">
                    {client.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#204CC7] rounded-full transition-all duration-300"
                    style={{ width: `${client.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Marketing Widget */}
        <div className="bg-white rounded-xl border border-black/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-body font-semibold text-black/90">Performance Marketing</h3>
              <button className="text-black/30 hover:text-black/60 transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <Link
              href="/workspace/performance-marketing"
              className="text-caption font-medium text-[#204CC7] hover:text-[#204CC7]/80 transition-colors px-2.5 py-1 rounded-lg hover:bg-[#204CC7]/5"
            >
              See All
            </Link>
          </div>
          <p className="text-caption text-black/55 mb-4">Nov 2025</p>
          <div className="space-y-3">
            {mockPerformanceMarketingData.slice(0, 3).map((client) => (
              <div
                key={client.id}
                className="relative flex items-center gap-3 p-3 rounded-xl border border-black/5 hover:border-[#204CC7]/20 hover:bg-black/[0.02] transition-all cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClientMenu(showClientMenu === client.id ? null : client.id);
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-caption font-medium text-black/80 truncate mb-1">{client.clientName}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center">
                        <span className="text-micro font-medium text-black/60">{client.totalItems}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                        <span className="text-micro text-blue-600">{client.ideation}</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center">
                        <span className="text-micro text-orange-600">{client.creation}</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                        <span className="text-micro text-emerald-600">{client.approved}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {showClientMenu === client.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowClientMenu(null);
                      }}
                    />
                    <div
                      className="absolute right-0 top-full mt-1 z-50 bg-white/80 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/[0.08] p-1 min-w-[180px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href="/workspace/performance-marketing"
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-black/[0.04] rounded-xl transition-all text-left group"
                        onClick={() => setShowClientMenu(null)}
                      >
                        <LayoutGrid className="w-3.5 h-3.5 text-black/60 group-hover:text-[#204CC7] transition-colors" />
                        <span className="text-caption font-medium text-black/70 group-hover:text-black/90">Creative Workflow</span>
                      </Link>
                      <Link
                        href="/workspace/performance-marketing"
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-black/[0.04] rounded-xl transition-all text-left group"
                        onClick={() => setShowClientMenu(null)}
                      >
                        <FileText className="w-3.5 h-3.5 text-black/60 group-hover:text-[#204CC7] transition-colors" />
                        <span className="text-caption font-medium text-black/70 group-hover:text-black/90">Media Plan</span>
                      </Link>
                      <Link
                        href="/workspace/performance-marketing"
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-black/[0.04] rounded-xl transition-all text-left group"
                        onClick={() => setShowClientMenu(null)}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-black/60 group-hover:text-[#204CC7] transition-colors" />
                        <span className="text-caption font-medium text-black/70 group-hover:text-black/90">Reports</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Open Tasks Widget */}
        <div className="bg-white rounded-xl border border-black/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-body font-semibold text-black/90">Open Tasks</h3>
              <button className="text-black/30 hover:text-black/60 transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <Link
              href="/workspace/task-management"
              className="text-caption font-medium text-[#204CC7] hover:text-[#204CC7]/80 transition-colors px-2.5 py-1 rounded-lg hover:bg-[#204CC7]/5"
            >
              See All
            </Link>
          </div>
          <div className="space-y-2">
            {mockOpenTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl border border-black/5 hover:border-[#204CC7]/20 hover:bg-black/[0.02] transition-all cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-caption font-medium text-black/80 truncate mb-1">{task.title}</p>
                  <div className="flex items-center gap-1.5 text-micro text-black/55">
                    <Calendar className="w-3 h-3" />
                    <span>{task.dueDate}</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-black/20 group-hover:text-[#204CC7] transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
