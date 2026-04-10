export interface ClientMarginEntry {
  id: string;
  clientName: string;
  service: 'SEM' | 'A&T';
  hod: string;
  billingPerMonth: number;
  totalCost: number;
  grossMargin: number;
  marginPercent: number;
  trend: 'up' | 'down' | 'stable';
  status: 'Healthy' | 'At Risk';
}

export const clientMarginData: ClientMarginEntry[] = [
  // SEM Clients (Chinmay Pawar)
  { id: 'pm-001', clientName: 'Zenith Retail', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 250000, totalCost: 230000, grossMargin: 20000, marginPercent: 8.0, trend: 'up', status: 'At Risk' },
  { id: 'pm-002', clientName: 'NovaTech Solutions', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 180000, totalCost: 170000, grossMargin: 10000, marginPercent: 5.5, trend: 'down', status: 'At Risk' },
  { id: 'pm-003', clientName: 'Bloom Botanics', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 145000, totalCost: 132000, grossMargin: 13000, marginPercent: 9.0, trend: 'stable', status: 'At Risk' },
  { id: 'pm-004', clientName: 'Meridian Healthcare', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 320000, totalCost: 275000, grossMargin: 45000, marginPercent: 14.1, trend: 'up', status: 'Healthy' },
  { id: 'pm-005', clientName: 'UrbanNest Realty', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 210000, totalCost: 190000, grossMargin: 20000, marginPercent: 9.5, trend: 'stable', status: 'At Risk' },
  { id: 'pm-006', clientName: 'FreshBite Foods', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 175000, totalCost: 156000, grossMargin: 19000, marginPercent: 10.9, trend: 'down', status: 'At Risk' },
  { id: 'pm-007', clientName: 'Pinnacle Logistics', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 290000, totalCost: 248000, grossMargin: 42000, marginPercent: 14.5, trend: 'up', status: 'Healthy' },
  { id: 'pm-008', clientName: 'Luminous Textiles', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 225000, totalCost: 210000, grossMargin: 15000, marginPercent: 6.7, trend: 'down', status: 'At Risk' },
  { id: 'pm-009', clientName: 'Quantum Analytics', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 195000, totalCost: 167000, grossMargin: 28000, marginPercent: 14.4, trend: 'up', status: 'Healthy' },
  { id: 'pm-010', clientName: 'VortexCom Digital', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 165000, totalCost: 144000, grossMargin: 21000, marginPercent: 12.7, trend: 'stable', status: 'Healthy' },
  { id: 'pm-011', clientName: 'Apex Ventures', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 135000, totalCost: 122000, grossMargin: 13000, marginPercent: 9.6, trend: 'down', status: 'At Risk' },
  { id: 'pm-012', clientName: 'Stellar Brand Co.', service: 'SEM', hod: 'Chinmay Pawar', billingPerMonth: 245000, totalCost: 216000, grossMargin: 29000, marginPercent: 11.8, trend: 'up', status: 'Healthy' },

  // A&T Clients (Zubear Shaikh)
  { id: 'at-001', clientName: 'Synergys Consulting', service: 'A&T', hod: 'Zubear Shaikh', billingPerMonth: 85000, totalCost: 47000, grossMargin: 38000, marginPercent: 44.7, trend: 'up', status: 'Healthy' },
  { id: 'at-002', clientName: 'Harmony Capital', service: 'A&T', hod: 'Zubear Shaikh', billingPerMonth: 120000, totalCost: 64000, grossMargin: 56000, marginPercent: 46.7, trend: 'stable', status: 'Healthy' },
  { id: 'at-003', clientName: 'Prism Fintech', service: 'A&T', hod: 'Zubear Shaikh', billingPerMonth: 95000, totalCost: 51000, grossMargin: 44000, marginPercent: 46.3, trend: 'up', status: 'Healthy' },
  { id: 'at-004', clientName: 'Nexus Enterprises', service: 'A&T', hod: 'Zubear Shaikh', billingPerMonth: 145000, totalCost: 73000, grossMargin: 72000, marginPercent: 49.7, trend: 'up', status: 'Healthy' },
  { id: 'at-005', clientName: 'Vektor Manufacturing', service: 'A&T', hod: 'Zubear Shaikh', billingPerMonth: 75000, totalCost: 42000, grossMargin: 33000, marginPercent: 44.0, trend: 'stable', status: 'Healthy' },
  { id: 'at-006', clientName: 'Olympus Group', service: 'A&T', hod: 'Zubear Shaikh', billingPerMonth: 110000, totalCost: 56000, grossMargin: 54000, marginPercent: 49.1, trend: 'up', status: 'Healthy' },
  { id: 'at-007', clientName: 'Titan Industries', service: 'A&T', hod: 'Zubear Shaikh', billingPerMonth: 130000, totalCost: 66000, grossMargin: 64000, marginPercent: 49.2, trend: 'stable', status: 'Healthy' },
];
