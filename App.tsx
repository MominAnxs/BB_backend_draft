'use client';
import { useState } from 'react';
import { Overview } from './Overview';
import { AttritionReport } from './AttritionReport';
import { CLAReport } from './CLAReport';
import { GrowthPLReport } from './GrowthPLReport';
import { SalesReport } from './SalesReport';
import { Adminland } from './Adminland';
import { Navigation } from './Navigation';
import { ProfileSettings } from './ProfileSettings';
import { Inbox } from './Inbox';
import { Dataroom } from './Dataroom';
import { ReportingModule } from './adminland/ReportingModule';
import { Workspace } from './Workspace';

type Section = 'dashboard' | 'inbox' | 'reports' | 'workspace' | 'dataroom' | 'adminland' | 'profile';
type DashboardTab = 'overview' | 'attrition' | 'cla' | 'growth-pl' | 'sales';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>('overview');
  const [globalDateRange, setGlobalDateRange] = useState<'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4'>('ytd');
  const [globalDepartment, setGlobalDepartment] = useState<'All' | 'Finance' | 'Performance Marketing'>('All');

  const handleNavigate = (section: string) => {
    setActiveSection(section as Section);
  };

  const handleProfileClick = () => {
    setActiveSection('profile');
  };

  const handleAdminlandClick = () => {
    setActiveSection('adminland');
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const renderDashboardContent = () => {
    switch (activeDashboardTab) {
      case 'overview':
        return <Overview globalDateRange={globalDateRange} globalDepartment={globalDepartment} />;
      case 'attrition':
        return <AttritionReport />;
      case 'cla':
        return <CLAReport />;
      case 'growth-pl':
        return <GrowthPLReport />;
      case 'sales':
        return <SalesReport />;
      default:
        return <Overview globalDateRange={globalDateRange} globalDepartment={globalDepartment} />;
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardContent();
      case 'inbox':
        return <Inbox />;
      case 'reports':
        return <ReportingModule />;
      case 'workspace':
        return <Workspace />;
      case 'dataroom':
        return <Dataroom />;
      case 'adminland':
        return <Adminland />;
      case 'profile':
        return <ProfileSettings />;
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onProfileClick={handleProfileClick}
        onAdminlandClick={handleAdminlandClick}
        onLogout={handleLogout}
        activeTab={activeDashboardTab}
        onTabChange={(tab) => setActiveDashboardTab(tab as DashboardTab)}
        isAdminland={activeSection === 'adminland'}
        globalDateRange={globalDateRange}
        onDateRangeChange={setGlobalDateRange}
        globalDepartment={globalDepartment}
        onDepartmentChange={setGlobalDepartment}
      />
      <main className={`text-body ${activeSection === 'workspace' ? '' : 'max-w-[1600px] mx-auto px-6 py-5'}`}>
        {renderContent()}
      </main>
    </div>
  );
}