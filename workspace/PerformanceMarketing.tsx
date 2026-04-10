'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Share, ChevronLeft, ChevronRight, MoreVertical, ChevronDown, LayoutGrid, FileText, BarChart3, Globe, Camera, Link2, Play, ArrowUpDown, Calendar, Users, Target, X, Check, Trash2, Tag, Plus, GripVertical, Pencil, Trash, Copy, UserPlus, ArrowRight, CircleCheck, User, Megaphone, MessageSquareText, Send, Eye, Hash, CalendarCheck2, CheckCircle2, Building2, ExternalLink, Package, Star, Crosshair, MapPin, Briefcase, Phone, Zap, MessageCircle, AlertCircle, Sparkles, Clock as ClockIcon } from 'lucide-react';
import { MonthNavigator, MONTHS } from './shared/MonthNavigator';
import { PeriodLabel } from './shared/PeriodLabel';
import { ClientDetailView } from './ClientDetailView';

type View = 'clientList' | 'creativeWorkflow' | 'mediaPlan' | 'reports';
type SortField = 'name' | 'clientType' | 'ksmTarget';
type SortDir = 'asc' | 'desc';
type ClientType = 'Ecommerce' | 'Lead generation';
type KSMStatus = 'Miss' | 'Hit';
type KickoffStatus = 'Pending' | 'Onboarding' | 'Done';
type OnboardingStatus = 'Pending' | 'In Progress' | 'Complete';
type GrowthPlanStatus = 'Not Started' | 'In Progress' | 'Sent';

// ── Growth Plan types ──
interface GrowthPlanTask {
  id: string;
  title: string;
  description: string;
  done: boolean;
}

interface GrowthPlanWeek {
  whatsHappening: string;
  tasks: GrowthPlanTask[];
}

// Keyed by week index (0-based), dynamic number of weeks per month
type GrowthPlanData = Record<number, GrowthPlanWeek>;

// ── Week range computed from planStartDate ──
interface WeekRange {
  index: number;       // 0-based
  start: Date;         // Monday or planStart (whichever is later)
  end: Date;           // Sunday or month-end (whichever is earlier)
  label: string;       // e.g. "Apr 15–21"
  isCurrent: boolean;  // contains today
}

/** Compute rolling 7-day week ranges for the current viewing month,
 *  anchored from the client's planStartDate.
 *
 *  - If client started mid-month, Week 1 starts on planStartDate
 *  - Each subsequent week is the next 7 days
 *  - Final week may be shorter (truncated at month end)
 *  - For months after the start month, weeks run 1–7, 8–14, etc. from day 1
 */
function computeWeekRanges(planStartISO: string, viewMonth: number, viewYear: number): WeekRange[] {
  const planStart = new Date(planStartISO + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Determine the anchor day for this month
  const startOfMonth = new Date(viewYear, viewMonth, 1);
  const endOfMonth = new Date(viewYear, viewMonth + 1, 0); // last day

  // If the plan started in a future month relative to viewMonth, no weeks
  if (planStart > endOfMonth) return [];

  // Anchor: planStartDate if same month, otherwise 1st of the month
  const anchor = (planStart.getFullYear() === viewYear && planStart.getMonth() === viewMonth)
    ? planStart
    : startOfMonth;

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = MONTHS_SHORT[viewMonth];

  const weeks: WeekRange[] = [];
  let cursor = new Date(anchor);
  let idx = 0;

  while (cursor <= endOfMonth) {
    const weekStart = new Date(cursor);
    const weekEndRaw = new Date(cursor);
    weekEndRaw.setDate(weekEndRaw.getDate() + 6);
    const weekEnd = weekEndRaw > endOfMonth ? endOfMonth : weekEndRaw;

    const isCurrent = today >= weekStart && today <= weekEnd;
    const label = weekStart.getMonth() === weekEnd.getMonth()
      ? `${mon} ${weekStart.getDate()}–${weekEnd.getDate()}`
      : `${mon} ${weekStart.getDate()}–${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}`;

    weeks.push({ index: idx, start: weekStart, end: weekEnd, label, isCurrent });

    // Advance cursor to next day after weekEnd
    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
    idx++;
  }

  return weeks;
}

// Kickoff data persisted on the client when Onboarding
interface KickoffData {
  assignments: Record<string, string>; // role → employee id
  proposedMetrics: KickoffMetrics;     // Brego-proposed targets
  clientMetrics?: KickoffMetrics;      // Client counter-proposal (if any)
  clientNotes?: Partial<Record<keyof KickoffMetrics, string>>; // Per-metric client notes
  hasClientResponse?: boolean;         // true once client responds
}

interface Client {
  id: string;
  name: string;
  team: { initials: string; color: string }[];
  clientType: ClientType;
  onboardingStatus: OnboardingStatus;  // Client-side business info submission
  kickoffStatus: KickoffStatus;
  kickoffData?: KickoffData;
  lastQC: string;             // ISO date string e.g. '2025-03-03'
  ksmTarget: KSMStatus;
  growthPlanStatus: GrowthPlanStatus;
  planStartDate?: string;     // ISO date — set when kickoff completes (triggers growth plan)
  comments: string;
}

// ── Business Info Types (collected from client-facing onboarding app) ──
interface BusinessProduct {
  name: string;
  category: string;
  priceRange: string;
  description: string;
}

interface BusinessCompetitor {
  name: string;
  website: string;
}

interface BusinessInfoData {
  companyName: string;
  website: string;
  industry: string;
  targetAudience: string;
  monthlyAdBudget: string;
  targetLocation: string[];
  primaryGoal: string;
  competitors: BusinessCompetitor[];
  products: BusinessProduct[];
  usps: string[];
}

// ── Lead Generation Business Info Types ──
interface LeadGenService {
  name: string;
  avgDealValue: string;
  avgSalesCycle: string;
}

interface LeadGenCompetitor {
  name: string;
  website: string;
  keyOffering: string;
}

interface LeadGenBusinessInfoData {
  companyName: string;
  website: string;
  industry: string;
  // Lead Generation Details
  primaryServiceOffered: string;
  serviceAreas: string[];
  monthlyAdBudget: string;
  averageDealValue: string;
  monthlyLeadVolumeTarget: string;
  // Competitors
  competitors: LeadGenCompetitor[];
  // Lead Funnel
  services: LeadGenService[];
  leadQualificationCriteria: { label: string; active: boolean }[];
  followUpChannels: string[];
}

// Business info keyed by client id — E-Commerce clients
// (Lead Gen clients are in clientLeadGenBusinessInfo below)
const clientBusinessInfo: Record<string, BusinessInfoData> = {
  '1': {
    companyName: 'Elan by Aanchal',
    website: 'https://elanbyanachal.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 22-40, Urban India, Fashion-conscious',
    monthlyAdBudget: '₹3L - ₹4.5L',
    targetLocation: ['Mumbai', 'Delhi NCR', 'Bangalore', 'Pune'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Nykaa Fashion', website: 'https://nykaa.com/fashion' },
      { name: 'Libas', website: 'https://libas.in' },
      { name: 'FabIndia', website: 'https://fabindia.com' },
    ],
    products: [
      { name: 'Silk Saree Collection', category: 'Ethnic Wear', priceRange: '₹3,500 - ₹12,000', description: 'Premium handloom silk sarees with contemporary prints and traditional borders.' },
      { name: 'Festive Kurta Sets', category: 'Ethnic Wear', priceRange: '₹1,800 - ₹4,500', description: 'Designer kurta sets for festive and wedding occasions.' },
    ],
    usps: ['Handcrafted by artisans', 'Sustainable fabrics only', 'Free alterations on all orders'],
  },
  '2': {
    companyName: 'July Issue',
    website: 'https://julyissue.in',
    industry: 'E-Commerce',
    targetAudience: 'Women 18-32, Metro cities, Trend-forward',
    monthlyAdBudget: '₹2L - ₹3L',
    targetLocation: ['Pan India', 'Metro cities'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Zara India', website: 'https://zara.com/in' },
      { name: 'H&M India', website: 'https://hm.com/in' },
      { name: 'Urbanic', website: 'https://urbanic.com' },
    ],
    products: [
      { name: 'Summer Dresses', category: 'Western Wear', priceRange: '₹1,200 - ₹3,500', description: 'Trendy summer dresses with bold prints and flattering silhouettes.' },
      { name: 'Co-ord Sets', category: 'Western Wear', priceRange: '₹1,500 - ₹2,800', description: 'Matching top-and-bottom sets perfect for brunches and casual outings.' },
    ],
    usps: ['New drops every Friday', 'Size-inclusive range (XS-3XL)', 'Easy 15-day returns'],
  },
  '5': {
    companyName: 'Skin Essentials',
    website: 'https://skinessentials.co.in',
    industry: 'E-Commerce',
    targetAudience: 'Women 25-45, Skincare enthusiasts, Premium segment',
    monthlyAdBudget: '₹2.5L - ₹3.5L',
    targetLocation: ['Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Minimalist', website: 'https://beminimalist.co' },
      { name: 'Plum Goodness', website: 'https://plumgoodness.com' },
      { name: 'Dot & Key', website: 'https://dotandkey.com' },
    ],
    products: [
      { name: 'Premium Skincare Kit', category: 'Skincare', priceRange: '₹2,500 - ₹5,000', description: 'Curated skincare routines with cleanser, serum, moisturiser, and SPF.' },
      { name: 'Vitamin C Serum', category: 'Skincare', priceRange: '₹800 - ₹1,500', description: 'Brightening serum with 15% Vitamin C and Hyaluronic Acid.' },
      { name: 'Anti-Ageing Night Cream', category: 'Skincare', priceRange: '₹1,200 - ₹2,200', description: 'Retinol-infused night cream for fine lines and wrinkle reduction.' },
    ],
    usps: ['100% organic ingredients', 'Dermatologist-tested', '30-day money-back guarantee'],
  },
  '6': {
    companyName: 'True Diamond',
    website: 'https://truediamond.in',
    industry: 'E-Commerce',
    targetAudience: 'Women 28-50, HNI segment, Jewellery buyers',
    monthlyAdBudget: '₹5L - ₹8L',
    targetLocation: ['Mumbai', 'Delhi', 'Surat', 'Ahmedabad'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'CaratLane', website: 'https://caratlane.com' },
      { name: 'Melorra', website: 'https://melorra.com' },
      { name: 'BlueStone', website: 'https://bluestone.com' },
    ],
    products: [
      { name: 'Diamond Solitaire Rings', category: 'Fine Jewellery', priceRange: '₹25,000 - ₹2,00,000', description: 'Certified natural diamond solitaires with IGI certification.' },
      { name: 'Everyday Gold Earrings', category: 'Fine Jewellery', priceRange: '₹8,000 - ₹35,000', description: 'Lightweight 18K gold earrings for daily wear.' },
    ],
    usps: ['IGI-certified diamonds', 'Lifetime exchange policy', 'Free insured shipping'],
  },
  '8': {
    companyName: 'Crystallicious',
    website: 'https://crystallicious.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 20-35, Fashion jewellery lovers, Budget-conscious',
    monthlyAdBudget: '₹1.5L - ₹2.5L',
    targetLocation: ['Pan India'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Zaveri Pearls', website: 'https://zaveripearls.com' },
      { name: 'Priyaasi', website: 'https://priyaasi.com' },
      { name: 'Jewelmaze', website: 'https://jewelmaze.in' },
    ],
    products: [
      { name: 'Crystal Statement Necklace', category: 'Fashion Jewellery', priceRange: '₹500 - ₹2,000', description: 'Eye-catching crystal necklaces for parties and events.' },
      { name: 'Layered Bracelet Set', category: 'Fashion Jewellery', priceRange: '₹350 - ₹1,200', description: 'Stackable bracelet sets in gold and silver finishes.' },
    ],
    usps: ['Free shipping on all orders', 'Tarnish-proof guarantee', 'New arrivals weekly'],
  },
  '9': {
    companyName: 'Bio Basket',
    website: 'https://biobasket.in',
    industry: 'E-Commerce',
    targetAudience: 'Health-conscious families, 28-50, Tier 1-2 cities',
    monthlyAdBudget: '₹1.5L - ₹2L',
    targetLocation: ['Mumbai', 'Pune', 'Bangalore', 'Hyderabad'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Organic Tattva', website: 'https://organictattva.com' },
      { name: '24 Mantra', website: 'https://24mantra.com' },
      { name: 'Farm2Fork', website: 'https://farm2fork.in' },
    ],
    products: [
      { name: 'Organic Grocery Box', category: 'Organic Food', priceRange: '₹800 - ₹2,500', description: 'Monthly curated box with organic pulses, grains, and cold-pressed oils.' },
      { name: 'Cold-Pressed Juice Pack', category: 'Beverages', priceRange: '₹400 - ₹900', description: 'Pack of 6 cold-pressed juices with no added sugar or preservatives.' },
    ],
    usps: ['100% certified organic', 'Farm-to-door in 48 hours', 'Subscription discounts'],
  },
  '12': {
    companyName: 'JM Group',
    website: 'https://jmgroup.co.in',
    industry: 'E-Commerce',
    targetAudience: 'Men & Women 25-45, Home decor enthusiasts',
    monthlyAdBudget: '₹2L - ₹3.5L',
    targetLocation: ['Mumbai', 'Delhi NCR', 'Bangalore'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Pepperfry', website: 'https://pepperfry.com' },
      { name: 'Urban Ladder', website: 'https://urbanladder.com' },
      { name: 'Wooden Street', website: 'https://woodenstreet.com' },
    ],
    products: [
      { name: 'Modular Furniture Sets', category: 'Home & Living', priceRange: '₹15,000 - ₹60,000', description: 'Space-saving modular furniture with customisable configurations.' },
      { name: 'Decorative Lighting', category: 'Home & Living', priceRange: '₹2,000 - ₹8,000', description: 'Contemporary pendant lights and floor lamps.' },
    ],
    usps: ['Custom-made options available', '10-year warranty', 'Free interior consultation'],
  },
  '14': {
    companyName: 'House of Saloni',
    website: 'https://houseofsaloni.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 24-40, Premium ethnic wear, Wedding shoppers',
    monthlyAdBudget: '₹3L - ₹5L',
    targetLocation: ['Pan India', 'NRI markets'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Kalki Fashion', website: 'https://kalkifashion.com' },
      { name: 'Meena Bazaar', website: 'https://meenabazaar.com' },
      { name: 'BIBA', website: 'https://biba.in' },
    ],
    products: [
      { name: 'Bridal Lehengas', category: 'Bridal Wear', priceRange: '₹15,000 - ₹75,000', description: 'Exquisite bridal lehengas with hand embroidery and mirror work.' },
      { name: 'Designer Anarkalis', category: 'Ethnic Wear', priceRange: '₹3,500 - ₹12,000', description: 'Floor-length anarkali suits with dupatta sets.' },
    ],
    usps: ['Handcrafted embroidery', 'International shipping', 'Virtual styling sessions'],
  },
  '19': {
    companyName: 'Knickgasm',
    website: 'https://knickgasm.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 18-35, Lingerie & innerwear, Comfort-first',
    monthlyAdBudget: '₹3.5L - ₹4.5L',
    targetLocation: ['Pan India'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Clovia', website: 'https://clovia.com' },
      { name: 'Zivame', website: 'https://zivame.com' },
      { name: 'Amante', website: 'https://amante.in' },
    ],
    products: [
      { name: 'Everyday Bralette', category: 'Innerwear', priceRange: '₹500 - ₹1,200', description: 'Wire-free bralettes designed for all-day comfort and support.' },
      { name: 'Loungewear Sets', category: 'Sleepwear', priceRange: '₹800 - ₹1,800', description: 'Soft cotton loungewear sets in pastel shades.' },
    ],
    usps: ['Size calculator with 98% accuracy', 'Discreet packaging', 'Easy 30-day exchange'],
  },
};

// Lead Gen business info keyed by client id
const clientLeadGenBusinessInfo: Record<string, LeadGenBusinessInfoData> = {
  '3': {
    companyName: 'Mahesh Interior',
    website: 'https://maheshinterior.com',
    industry: 'Interior Design',
    primaryServiceOffered: 'Residential & Commercial Interior Design',
    serviceAreas: ['Mumbai', 'Navi Mumbai', 'Thane', 'Pune'],
    monthlyAdBudget: '₹2L - ₹3L',
    averageDealValue: '₹5L - ₹15L',
    monthlyLeadVolumeTarget: '80-120 leads',
    competitors: [
      { name: 'Livspace', website: 'https://livspace.com', keyOffering: 'End-to-end interior design with modular solutions' },
      { name: 'HomeLane', website: 'https://homelane.com', keyOffering: 'Budget-friendly modular interiors with financing' },
      { name: 'Design Cafe', website: 'https://designcafe.com', keyOffering: 'Premium turnkey interior solutions' },
    ],
    services: [
      { name: 'Full Home Interior', avgDealValue: '₹12L', avgSalesCycle: '2-3 months' },
      { name: 'Modular Kitchen', avgDealValue: '₹3.5L', avgSalesCycle: '3-4 weeks' },
      { name: 'Office Interior', avgDealValue: '₹8L', avgSalesCycle: '1-2 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Email', 'Site Visit'],
  },
  '7': {
    companyName: 'Una Homes LLP',
    website: 'https://unahomes.in',
    industry: 'Real Estate',
    primaryServiceOffered: 'Premium Residential Properties',
    serviceAreas: ['Mumbai', 'Alibag', 'Goa'],
    monthlyAdBudget: '₹5L - ₹8L',
    averageDealValue: '₹50L - ₹2Cr',
    monthlyLeadVolumeTarget: '40-60 leads',
    competitors: [
      { name: 'Lodha Group', website: 'https://lodhagroup.in', keyOffering: 'Luxury high-rise apartments' },
      { name: 'Godrej Properties', website: 'https://godrejproperties.com', keyOffering: 'Trust factor with sustainable developments' },
      { name: 'Oberoi Realty', website: 'https://oberoirealty.com', keyOffering: 'Ultra-premium residences' },
    ],
    services: [
      { name: 'Luxury Villa Sales', avgDealValue: '₹1.5Cr', avgSalesCycle: '3-6 months' },
      { name: 'Premium Apartments', avgDealValue: '₹75L', avgSalesCycle: '2-4 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: false },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Site Visit'],
  },
  '10': {
    companyName: 'Third Eye Brands & Concepts',
    website: 'https://thirdeyebrands.com',
    industry: 'Branding & Marketing',
    primaryServiceOffered: 'Brand Strategy & Creative Consulting',
    serviceAreas: ['Pan India', 'International'],
    monthlyAdBudget: '₹1.5L - ₹2.5L',
    averageDealValue: '₹2L - ₹8L',
    monthlyLeadVolumeTarget: '30-50 leads',
    competitors: [
      { name: 'WATConsult', website: 'https://watconsult.com', keyOffering: 'Digital-first brand solutions' },
      { name: 'Schbang', website: 'https://schbang.com', keyOffering: 'Integrated creative + performance marketing' },
      { name: 'Social Beat', website: 'https://socialbeat.in', keyOffering: 'Data-driven digital marketing' },
    ],
    services: [
      { name: 'Brand Identity Package', avgDealValue: '₹5L', avgSalesCycle: '3-4 weeks' },
      { name: 'Creative Campaign', avgDealValue: '₹3L', avgSalesCycle: '2-3 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'Video Call'],
  },
  '11': {
    companyName: 'Bybit Technologies',
    website: 'https://bybit.tech',
    industry: 'Technology',
    primaryServiceOffered: 'Enterprise Software Solutions',
    serviceAreas: ['Mumbai', 'Bangalore', 'Hyderabad', 'Delhi NCR'],
    monthlyAdBudget: '₹3L - ₹5L',
    averageDealValue: '₹10L - ₹25L',
    monthlyLeadVolumeTarget: '20-35 leads',
    competitors: [
      { name: 'TCS Digital', website: 'https://tcs.com', keyOffering: 'Large-scale enterprise transformation' },
      { name: 'Zoho', website: 'https://zoho.com', keyOffering: 'Affordable SaaS business suite' },
      { name: 'Freshworks', website: 'https://freshworks.com', keyOffering: 'Modern cloud-native CRM & ITSM' },
    ],
    services: [
      { name: 'Custom ERP Development', avgDealValue: '₹20L', avgSalesCycle: '2-3 months' },
      { name: 'Cloud Migration', avgDealValue: '₹8L', avgSalesCycle: '4-6 weeks' },
      { name: 'SaaS Product Development', avgDealValue: '₹15L', avgSalesCycle: '3-4 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'Video Call', 'LinkedIn'],
  },
  '18': {
    companyName: 'ISPAN Services',
    website: 'https://ispanservices.com',
    industry: 'IT Services',
    primaryServiceOffered: 'Managed IT & Cloud Infrastructure',
    serviceAreas: ['Mumbai', 'Pune', 'Bangalore'],
    monthlyAdBudget: '₹2L - ₹3.5L',
    averageDealValue: '₹5L - ₹12L',
    monthlyLeadVolumeTarget: '25-40 leads',
    competitors: [
      { name: 'Rackspace', website: 'https://rackspace.com', keyOffering: 'Multi-cloud managed services' },
      { name: 'Ctrl S', website: 'https://ctrls.in', keyOffering: 'Tier 4 data centre hosting' },
      { name: 'Netmagic (NTT)', website: 'https://netmagic.com', keyOffering: 'Hybrid cloud & colocation' },
    ],
    services: [
      { name: 'Managed Cloud Hosting', avgDealValue: '₹8L', avgSalesCycle: '3-4 weeks' },
      { name: 'IT Infrastructure Setup', avgDealValue: '₹6L', avgSalesCycle: '2-3 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'WhatsApp'],
  },
  '20': {
    companyName: 'Maharishi Ayurveda Hospitals',
    website: 'https://maharishiayurveda.in',
    industry: 'Healthcare',
    primaryServiceOffered: 'Ayurvedic Treatment & Wellness Programs',
    serviceAreas: ['Delhi NCR', 'Noida', 'Gurgaon', 'Jaipur'],
    monthlyAdBudget: '₹3L - ₹4.5L',
    averageDealValue: '₹30K - ₹2L',
    monthlyLeadVolumeTarget: '150-250 leads',
    competitors: [
      { name: 'Jiva Ayurveda', website: 'https://jiva.com', keyOffering: 'Online Ayurveda consultations' },
      { name: 'Kottakkal Arya Vaidya Sala', website: 'https://aryavaidyasala.com', keyOffering: 'Heritage Ayurveda treatments' },
      { name: 'Patanjali Wellness', website: 'https://patanjaliayurved.net', keyOffering: 'Affordable Ayurveda at scale' },
    ],
    services: [
      { name: 'Panchakarma Therapy', avgDealValue: '₹1.2L', avgSalesCycle: '1-2 weeks' },
      { name: 'Chronic Disease Management', avgDealValue: '₹80K', avgSalesCycle: '1-2 weeks' },
      { name: 'Wellness Retreat Packages', avgDealValue: '₹50K', avgSalesCycle: '3-5 days' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: false },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'SMS'],
  },
  '23': {
    companyName: 'Mercury Air Conditioners',
    website: 'https://mercuryac.in',
    industry: 'HVAC',
    primaryServiceOffered: 'AC Sales, Installation & AMC',
    serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune'],
    monthlyAdBudget: '₹1.5L - ₹2.5L',
    averageDealValue: '₹50K - ₹3L',
    monthlyLeadVolumeTarget: '100-180 leads',
    competitors: [
      { name: 'Daikin India', website: 'https://daikinindia.com', keyOffering: 'Energy-efficient inverter ACs' },
      { name: 'Blue Star', website: 'https://bluestarindia.com', keyOffering: 'Commercial HVAC expertise' },
      { name: 'Voltas', website: 'https://voltas.com', keyOffering: 'Affordable cooling solutions' },
    ],
    services: [
      { name: 'Commercial HVAC Installation', avgDealValue: '₹2.5L', avgSalesCycle: '2-3 weeks' },
      { name: 'Residential AC Sales', avgDealValue: '₹60K', avgSalesCycle: '3-5 days' },
      { name: 'Annual Maintenance Contracts', avgDealValue: '₹35K', avgSalesCycle: '1 week' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: false },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Site Visit'],
  },
  '25': {
    companyName: 'MyScaai Bharat Construction',
    website: 'https://myscaai.com',
    industry: 'Construction',
    primaryServiceOffered: 'Residential & Commercial Construction',
    serviceAreas: ['Mumbai', 'Pune', 'Nashik', 'Nagpur'],
    monthlyAdBudget: '₹3L - ₹5L',
    averageDealValue: '₹20L - ₹1Cr',
    monthlyLeadVolumeTarget: '30-50 leads',
    competitors: [
      { name: 'Shapoorji Pallonji', website: 'https://shapoorjipallonji.com', keyOffering: 'Legacy construction with trusted brand' },
      { name: 'L&T Construction', website: 'https://lntecc.com', keyOffering: 'Large-scale infrastructure projects' },
      { name: 'Hiranandani Builders', website: 'https://hiranandani.com', keyOffering: 'Township development expertise' },
    ],
    services: [
      { name: 'Custom Home Construction', avgDealValue: '₹50L', avgSalesCycle: '2-4 months' },
      { name: 'Commercial Building Projects', avgDealValue: '₹80L', avgSalesCycle: '3-6 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Site Visit', 'Email'],
  },
  '27': {
    companyName: 'Pytheos Health Systems',
    website: 'https://pytheos.in',
    industry: 'HealthTech',
    primaryServiceOffered: 'Hospital Management Software & Digital Health',
    serviceAreas: ['Pan India'],
    monthlyAdBudget: '₹2.5L - ₹4L',
    averageDealValue: '₹8L - ₹20L',
    monthlyLeadVolumeTarget: '15-30 leads',
    competitors: [
      { name: 'Practo', website: 'https://practo.com', keyOffering: 'Doctor discovery + clinic management' },
      { name: 'eHospital Systems', website: 'https://ehospital.in', keyOffering: 'Affordable HMS for small hospitals' },
      { name: 'Insta by Practo', website: 'https://insta.practo.com', keyOffering: 'Enterprise hospital ERP' },
    ],
    services: [
      { name: 'Hospital Management System', avgDealValue: '₹15L', avgSalesCycle: '2-3 months' },
      { name: 'Telemedicine Platform', avgDealValue: '₹6L', avgSalesCycle: '4-6 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'Video Call', 'LinkedIn'],
  },
  '32': {
    companyName: 'Thai naam',
    website: 'https://thaiinaam.com',
    industry: 'Food & Beverage',
    primaryServiceOffered: 'Thai Restaurant & Cloud Kitchen',
    serviceAreas: ['Mumbai', 'Pune'],
    monthlyAdBudget: '₹1L - ₹2L',
    averageDealValue: '₹800 - ₹2,500',
    monthlyLeadVolumeTarget: '500-800 leads',
    competitors: [
      { name: 'Mamagoto', website: 'https://mamagoto.in', keyOffering: 'Pan-Asian dining experience' },
      { name: 'Busaba', website: 'https://busaba.in', keyOffering: 'Authentic Thai street food' },
      { name: 'Soy Street', website: 'https://soystreet.in', keyOffering: 'Budget Asian cuisine' },
    ],
    services: [
      { name: 'Dine-in Reservations', avgDealValue: '₹1,500', avgSalesCycle: 'Same day' },
      { name: 'Catering Orders', avgDealValue: '₹15K', avgSalesCycle: '3-5 days' },
      { name: 'Corporate Meal Plans', avgDealValue: '₹40K', avgSalesCycle: '1-2 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: false },
      { label: 'Decision-maker identified', active: false },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['WhatsApp', 'Phone Call', 'Instagram DM'],
  },
  '33': {
    companyName: 'The Derm Clinic',
    website: 'https://thedermclinic.in',
    industry: 'Dermatology',
    primaryServiceOffered: 'Skin & Hair Treatment Consultations',
    serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai'],
    monthlyAdBudget: '₹2.5L - ₹3.5L',
    averageDealValue: '₹15K - ₹1L',
    monthlyLeadVolumeTarget: '200-350 leads',
    competitors: [
      { name: 'Kaya Skin Clinic', website: 'https://kaya.in', keyOffering: 'Nationwide chain with standardised treatments' },
      { name: 'VLCC', website: 'https://vlccwellness.com', keyOffering: 'Wellness + beauty combo packages' },
      { name: 'Oliva Clinic', website: 'https://olivaclinic.com', keyOffering: 'Advanced laser dermatology' },
    ],
    services: [
      { name: 'Laser Hair Removal', avgDealValue: '₹60K', avgSalesCycle: '1-2 weeks' },
      { name: 'Acne & Scar Treatment', avgDealValue: '₹35K', avgSalesCycle: '1 week' },
      { name: 'Hair Loss Consultation', avgDealValue: '₹25K', avgSalesCycle: '3-5 days' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: false },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'SMS'],
  },
  '34': {
    companyName: 'Unigo',
    website: 'https://unigo.co.in',
    industry: 'Education',
    primaryServiceOffered: 'Study Abroad Counselling & Visa Assistance',
    serviceAreas: ['Mumbai', 'Delhi NCR', 'Bangalore', 'Hyderabad', 'Chennai'],
    monthlyAdBudget: '₹3L - ₹5L',
    averageDealValue: '₹1L - ₹3L',
    monthlyLeadVolumeTarget: '300-500 leads',
    competitors: [
      { name: 'IDP Education', website: 'https://idp.com', keyOffering: 'IELTS testing + global university partnerships' },
      { name: 'Leverage Edu', website: 'https://leverageedu.com', keyOffering: 'AI-driven university matching' },
      { name: 'Yocket', website: 'https://yocket.com', keyOffering: 'Community-driven study abroad platform' },
    ],
    services: [
      { name: 'University Admissions', avgDealValue: '₹2L', avgSalesCycle: '2-4 weeks' },
      { name: 'Visa Processing', avgDealValue: '₹50K', avgSalesCycle: '2-3 weeks' },
      { name: 'Test Prep (IELTS/GRE)', avgDealValue: '₹30K', avgSalesCycle: '1-2 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Email', 'Video Call'],
  },
  '37': {
    companyName: 'TREC',
    website: 'https://trec.co.in',
    industry: 'Real Estate',
    primaryServiceOffered: 'Commercial & Retail Real Estate Consulting',
    serviceAreas: ['Mumbai', 'Pune', 'Bangalore'],
    monthlyAdBudget: '₹2L - ₹3.5L',
    averageDealValue: '₹25L - ₹1Cr',
    monthlyLeadVolumeTarget: '20-40 leads',
    competitors: [
      { name: 'CBRE India', website: 'https://cbre.co.in', keyOffering: 'Global commercial real estate network' },
      { name: 'JLL India', website: 'https://jll.co.in', keyOffering: 'End-to-end property management' },
      { name: 'Cushman & Wakefield', website: 'https://cushmanwakefield.com', keyOffering: 'Corporate real estate advisory' },
    ],
    services: [
      { name: 'Commercial Leasing', avgDealValue: '₹50L', avgSalesCycle: '2-4 months' },
      { name: 'Retail Space Consulting', avgDealValue: '₹30L', avgSalesCycle: '1-3 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'Email', 'Site Visit', 'Video Call'],
  },
};

// ── Kickoff Modal Types ──
interface KickoffMetrics {
  adSpend: string;
  roas: string;
  revenue: string;
  orders: string;
  aov: string;
  leads: string;
  cpl: string;
  ctr: string;
}

const pmEmployeePool = [
  { id: 'e1', name: 'Rajesh Kumar', role: 'HOD/Sr. Manager' },
  { id: 'e2', name: 'Meera Nair', role: 'HOD/Sr. Manager' },
  { id: 'e3', name: 'Priya Sharma', role: 'Manager' },
  { id: 'e4', name: 'Kavya Iyer', role: 'Manager' },
  { id: 'e5', name: 'Arjun Mehta', role: 'Manager' },
  { id: 'e6', name: 'Rohan Desai', role: 'Sr. Executive' },
  { id: 'e7', name: 'Ishaan Joshi', role: 'Sr. Executive' },
  { id: 'e8', name: 'Aditya Verma', role: 'Sr. Executive' },
  { id: 'e9', name: 'Sneha Patel', role: 'Jr. Executive' },
  { id: 'e10', name: 'Vikram Singh', role: 'Jr. Executive' },
  { id: 'e11', name: 'Ananya Reddy', role: 'Graphic Designer' },
  { id: 'e12', name: 'Karan Malhotra', role: 'Graphic Designer' },
  { id: 'e13', name: 'Neha Kapoor', role: 'Video Editor' },
  { id: 'e14', name: 'Siddharth Shah', role: 'Video Editor' },
  { id: 'e15', name: 'Amit Verma', role: 'Video Shooter' },
  { id: 'e16', name: 'Akash Patel', role: 'Motion Graphics' },
];

const pmRoleSlots = [
  { role: 'HOD/Sr. Manager', required: true },
  { role: 'Manager', required: true },
  { role: 'Sr. Executive', required: true },
  { role: 'Jr. Executive', required: true },
  { role: 'Graphic Designer', required: false },
  { role: 'Video Editor', required: false },
  { role: 'Video Shooter', required: false },
  { role: 'Motion Graphics', required: false },
];

// ── Date helpers ──
function formatQCDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${day}${suffix} ${month}`;
}

function addDays(iso: string, days: number): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const mockClients: Client[] = [
  // Clients with businessInfo data → Complete | Pending kickoff → Pending | Some mid-way → In Progress
  { id: '1', name: 'Elan by Aanchal', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-03', comments: '' },
  { id: '2', name: 'July Issue', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-05', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '3', name: 'Mahesh Interior', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '4', name: 'Nor Black Nor White', team: [], clientType: 'Ecommerce', onboardingStatus: 'Pending', kickoffStatus: 'Pending', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '' },
  { id: '5', name: 'Skin Essentials', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-01', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-18', comments: '' },
  { id: '6', name: 'True Diamond', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '7', name: 'Una Homes LLP', team: [], clientType: 'Lead generation', onboardingStatus: 'In Progress', kickoffStatus: 'Pending', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '' },
  { id: '8', name: 'Crystallicious', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '9', name: 'Bio Basket', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-02', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-24', comments: '' },
  { id: '10', name: 'Third Eye Brands & Concepts', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '11', name: 'Bybit Technologies', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-05', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', planStartDate: '2026-03-01', comments: '' },
  { id: '12', name: 'JM Group', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '13', name: 'Enagenbio', team: [], clientType: 'Lead generation', onboardingStatus: 'Pending', kickoffStatus: 'Pending', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '' },
  { id: '14', name: 'House of Saloni', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '15', name: 'Inkling & Co.', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-01', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '16', name: 'Ivaana Ventures (Aerome)', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-06', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '17', name: 'Ivaana Ventures (Scentitude)', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '18', name: 'ISPAN Services', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-05', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '19', name: 'Knickgasm', team: [{ initials: 'RK', color: '#7c3aed' }, { initials: 'PS', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Onboarding', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '', kickoffData: { assignments: { 'HOD/Sr. Manager': 'e1', 'Manager': 'e3', 'Sr. Executive': 'e6', 'Jr. Executive': 'e9' }, proposedMetrics: { adSpend: '400000', roas: '4.5', revenue: '1800000', orders: '800', aov: '2250', leads: '', cpl: '', ctr: '' }, clientMetrics: { adSpend: '350000', roas: '5.0', revenue: '1750000', orders: '700', aov: '2500', leads: '', cpl: '', ctr: '' }, clientNotes: { adSpend: 'We\'d prefer starting conservative on spend and scaling once we see consistent results.', roas: 'We expect a higher return ratio to justify the investment to our board.', revenue: 'Slightly lower is fine if we maintain better margins.', orders: 'Fewer orders is acceptable if AOV is higher.' }, hasClientResponse: true } },
  { id: '20', name: 'Maharishi Ayurveda Hospitals', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-04', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '21', name: 'Meeami Fashion', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '22', name: 'Littlewoods Kidswear', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-02', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '23', name: 'Mercury Air Conditioners', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '24', name: 'Mood Lift', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-05', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '25', name: 'MyScaai Bharat Construction', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '26', name: 'Nuvida Lifescience', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-04', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '27', name: 'Pytheos Health Systems', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '28', name: 'J Pearls', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-01', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '29', name: 'Runwave Creations', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-06', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '30', name: 'SVVAYAM', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '31', name: 'The Anaya Collections', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-05', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '32', name: 'Thai naam', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '33', name: 'The Derm Clinic', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-04', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '34', name: 'Unigo', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '35', name: 'Valiente Caps', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-02', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '36', name: 'Veya Wellness', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }], clientType: 'Ecommerce', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-05', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '37', name: 'TREC', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }], clientType: 'Lead generation', onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2025-03-03', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
];

// MonthPicker and MonthNavigator are now shared from ./shared/

// ── Filter Panel Component ──
function FilterPanel({
  filters,
  onChange,
  onClose,
  onReset,
  activeCount,
}: {
  filters: { clientType: ClientType | 'All'; ksmTarget: KSMStatus | 'All'; team: string; kickoffStatus: KickoffStatus | 'All'; growthPlan: GrowthPlanStatus | 'All'; onboarding: OnboardingStatus | 'All' };
  onChange: (f: typeof filters) => void;
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

  const teamMembers = [
    { initials: 'JD', name: 'Jay Desai' },
    { initials: 'AS', name: 'Aarti Shah' },
    { initials: 'PM', name: 'Priya Mehta' },
    { initials: 'RK', name: 'Rahul Kumar' },
  ];

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] p-0 z-50 w-[320px]">
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
        {/* Client Type */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">CLIENT TYPE</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Ecommerce', 'Lead generation'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, clientType: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all text-caption font-medium ${
                  filters.clientType === opt
                    ? 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Onboarding */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">ONBOARDING</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Pending', 'In Progress', 'Complete'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, onboarding: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-caption font-medium ${
                  filters.onboarding === opt
                    ? opt === 'Complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : opt === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : opt === 'Pending' ? 'bg-black/[0.04] text-black/60 border-black/10'
                    : 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${
                  opt === 'Complete' ? 'bg-emerald-500' : opt === 'In Progress' ? 'bg-amber-500' : opt === 'Pending' ? 'bg-black/25' : ''
                }`} />}
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Kickoff Status */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">KICKOFF STATUS</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Done', 'Onboarding', 'Pending'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, kickoffStatus: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-caption font-medium ${
                  filters.kickoffStatus === opt
                    ? opt === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : opt === 'Onboarding' ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : opt === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${
                  opt === 'Done' ? 'bg-emerald-500' : opt === 'Onboarding' ? 'bg-blue-500' : opt === 'Pending' ? 'bg-amber-500' : ''
                }`} />}
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* KSM Target */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">KSM TARGET</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Hit', 'Miss'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, ksmTarget: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-caption font-medium ${
                  filters.ksmTarget === opt
                    ? opt === 'Hit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : opt === 'Miss' ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${
                  opt === 'Hit' ? 'bg-emerald-500' : opt === 'Miss' ? 'bg-rose-500' : ''
                }`} />}
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
            {teamMembers.map(tm => (
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

        {/* Weekly Plan */}
        <div>
          <label className="text-black/60 mb-2 block text-micro font-semibold">WEEKLY PLAN</label>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Not Started', 'In Progress', 'Sent'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, growthPlan: opt })}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-caption font-medium ${
                  filters.growthPlan === opt
                    ? opt === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : opt === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : opt === 'Not Started' ? 'bg-black/[0.04] text-black/60 border-black/10'
                    : 'bg-[#EEF1FB] text-[#204CC7] border-[#204CC7]/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/20'
                }`}
              >
                {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${
                  opt === 'Sent' ? 'bg-emerald-500' : opt === 'In Progress' ? 'bg-blue-500' : opt === 'Not Started' ? 'bg-black/25' : ''
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


// ── Kickoff Modal Component ──
// ── Metric field config helper ──
type MetricFieldDef = { key: keyof KickoffMetrics; label: string; prefix?: string; suffix?: string; placeholder: string };
function getMetricFields(businessType: 'ecommerce' | 'leadgen'): MetricFieldDef[] {
  const common: MetricFieldDef = { key: 'adSpend', label: 'Ad Spend', prefix: '₹', placeholder: 'e.g. 500000' };
  if (businessType === 'ecommerce') {
    return [common, { key: 'roas', label: 'ROAS', suffix: 'x', placeholder: 'e.g. 5.0' }, { key: 'revenue', label: 'Revenue', prefix: '₹', placeholder: 'e.g. 2500000' }, { key: 'orders', label: 'Orders', placeholder: 'e.g. 1500' }, { key: 'aov', label: 'AOV', prefix: '₹', placeholder: 'e.g. 3500' }];
  }
  return [common, { key: 'leads', label: 'Leads', placeholder: 'e.g. 600' }, { key: 'cpl', label: 'CPL', prefix: '₹', placeholder: 'e.g. 700' }, { key: 'ctr', label: 'CTR', suffix: '%', placeholder: 'e.g. 3.0' }];
}
function formatMetricVal(val: string, prefix?: string, suffix?: string) {
  if (!val) return '—';
  const num = Number(val);
  const formatted = isNaN(num) ? val : (prefix === '₹' ? `₹${num.toLocaleString('en-IN')}` : num.toLocaleString('en-IN'));
  return suffix ? `${formatted}${suffix}` : formatted;
}

// ── Seed data for clients that already have a plan (keyed by 0-based week index) ──
const seedGrowthPlans: Record<string, GrowthPlanData> = {
  // Elan by Aanchal — established client, full-month April plan
  '1': {
    0: {
      whatsHappening: 'Kicking off April strong — launching fresh campaigns and refreshing creatives across all channels.',
      tasks: [
        { id: 't1', title: 'Launch Meta lookalike campaign', description: 'Target lookalike audiences based on top 5% of existing buyers by LTV.', done: true },
        { id: 't2', title: 'Google Shopping feed optimisation', description: 'Fix disapproved products and optimise titles and images for better CTR.', done: true },
        { id: 't3', title: 'CPA analysis — weekly report', description: 'Weekly CPA tracking helps us catch rising costs early.', done: true },
        { id: 't4', title: 'Audience segmentation refresh', description: 'Re-segment audiences by purchase recency and frequency for better targeting.', done: false },
        { id: 't5', title: 'Banner ad design — seasonal promo', description: 'Create new banner creatives for the spring/summer collection push.', done: false },
      ],
    },
    1: {
      whatsHappening: 'Scaling what works and cutting what doesn\'t — mid-month optimisation sprint.',
      tasks: [
        { id: 't6', title: 'Pause underperforming ad sets', description: 'Identify and pause ad sets with CPA 2x above target.', done: false },
        { id: 't7', title: 'Scale top 3 campaigns by 25%', description: 'Increase daily budgets on campaigns exceeding ROAS targets.', done: false },
        { id: 't8', title: 'A/B test new landing page', description: 'Test the updated product page against the current version for conversion rate.', done: false },
      ],
    },
    2: { whatsHappening: 'Retargeting push and creative refresh for the second half of the month.', tasks: [
      { id: 't9', title: 'Launch retargeting campaign', description: 'Target cart abandoners and product page visitors from the last 14 days.', done: false },
      { id: 't10', title: 'New video ad creatives', description: 'Produce 3 short-form video ads for Instagram Reels and YouTube Shorts.', done: false },
    ] },
    3: { whatsHappening: 'Month-end wrap-up — reporting, insights, and planning for next month.', tasks: [
      { id: 't11', title: 'Monthly performance report', description: 'Compile full-month metrics: spend, ROAS, revenue, orders, CPA by channel.', done: false },
      { id: 't12', title: 'Client review meeting prep', description: 'Prepare the deck with insights, wins, learnings, and next month recommendations.', done: false },
    ] },
  },
  // Skin Essentials — mid-month start (Mar 18). April is first full month.
  '5': {
    0: {
      whatsHappening: 'First full month — setting up campaign infrastructure and launching initial test campaigns.',
      tasks: [
        { id: 't13', title: 'Set up Meta Ads Manager structure', description: 'Create campaign hierarchy with proper naming conventions.', done: false },
        { id: 't14', title: 'Install and verify tracking pixels', description: 'Ensure Meta Pixel, Google Tag, and conversion events are firing correctly.', done: false },
        { id: 't15', title: 'Launch 3 test ad sets', description: 'Test different audience segments with ₹5K daily budget each.', done: false },
      ],
    },
  },
};

// ────────────── Business Info Modal ──────────────
function BusinessInfoModal({ client, onClose }: {
  client: Client;
  onClose: () => void;
}) {
  const isLeadGen = client.clientType === 'Lead generation';
  const ecomInfo = !isLeadGen ? clientBusinessInfo[client.id] : null;
  const leadGenInfo = isLeadGen ? clientLeadGenBusinessInfo[client.id] : null;
  const hasInfo = !!(ecomInfo || leadGenInfo);

  const [activeTab, setActiveTab] = useState<'basic' | 'competitors' | 'products' | 'funnel'>('basic');
  const [showNudgeOverlay, setShowNudgeOverlay] = useState(false);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [nudgeSending, setNudgeSending] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const accent = isLeadGen ? '#7C3AED' : '#204CC7';
  const accentBg = isLeadGen ? 'bg-purple-50' : 'bg-[#EEF1FB]';

  // ── Nudge System: detect incomplete onboarding sections ──
  const pendingItems: { label: string; category: string }[] = [];

  if (ecomInfo) {
    if (!ecomInfo.website) pendingItems.push({ label: 'Website URL', category: 'Basic Info' });
    if (!ecomInfo.targetAudience) pendingItems.push({ label: 'Target Audience', category: 'Basic Info' });
    if (!ecomInfo.monthlyAdBudget) pendingItems.push({ label: 'Monthly Ad Budget', category: 'Basic Info' });
    if (ecomInfo.targetLocation.length === 0) pendingItems.push({ label: 'Target Locations', category: 'Basic Info' });
    if (ecomInfo.competitors.length === 0) pendingItems.push({ label: 'Competitor Analysis', category: 'Competitors' });
    if (ecomInfo.products.length === 0) pendingItems.push({ label: 'Product Catalogue', category: 'Products & USPs' });
    if (ecomInfo.usps.length === 0) pendingItems.push({ label: 'Unique Selling Points', category: 'Products & USPs' });
  }
  if (leadGenInfo) {
    if (!leadGenInfo.website) pendingItems.push({ label: 'Website URL', category: 'Basic Info' });
    if (!leadGenInfo.primaryServiceOffered) pendingItems.push({ label: 'Primary Service', category: 'Basic Info' });
    if (leadGenInfo.serviceAreas.length === 0) pendingItems.push({ label: 'Service Areas', category: 'Basic Info' });
    if (!leadGenInfo.monthlyAdBudget) pendingItems.push({ label: 'Monthly Ad Budget', category: 'Basic Info' });
    if (leadGenInfo.competitors.length === 0) pendingItems.push({ label: 'Competitor Analysis', category: 'Competitors' });
    if (leadGenInfo.services.length === 0) pendingItems.push({ label: 'Services & Deal Values', category: 'Lead Funnel' });
    if (leadGenInfo.leadQualificationCriteria.length === 0) pendingItems.push({ label: 'Lead Qualification Criteria', category: 'Lead Funnel' });
    if (leadGenInfo.followUpChannels.length === 0) pendingItems.push({ label: 'Follow-up Channels', category: 'Lead Funnel' });
  }

  // Also flag if onboarding not yet complete at client level
  const onboardingIncomplete = client.onboardingStatus !== 'Complete';
  const showNudgeBanner = onboardingIncomplete || pendingItems.length > 0;

  const nudgeCompanyName = ecomInfo?.companyName || leadGenInfo?.companyName || client.name;
  const clientChannelSlug = nudgeCompanyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const generatePMNudgeMessage = () => {
    const lines: string[] = [];
    lines.push(`Hi ${nudgeCompanyName} team! 👋`);
    lines.push('');

    if (pendingItems.length > 0) {
      lines.push(`We're reviewing your business profile and noticed a few sections still need your input to get your ${isLeadGen ? 'lead generation' : 'e-commerce'} campaigns off the ground.`);
      lines.push('');
      lines.push(`📋 Pending Sections (${pendingItems.length}):`);
      pendingItems.forEach(item => lines.push(`  • ${item.label}`));
    } else if (onboardingIncomplete) {
      lines.push(`We noticed your onboarding is still ${client.onboardingStatus === 'Pending' ? 'pending — we haven\'t received your business information yet' : 'in progress'}.`);
      lines.push('');
      lines.push('Completing your business profile helps us:');
      lines.push('  • Set up campaigns faster');
      lines.push('  • Target the right audience from day one');
      lines.push('  • Benchmark against your competitors');
    }

    lines.push('');
    lines.push('You can complete everything directly in the Brego Client App under Business Info. Let us know if you have any questions!');
    return lines.join('\n');
  };

  const handlePMSendNudge = () => {
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

  if (!hasInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          role="dialog"
          aria-modal="true"
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[540px] p-10 text-center"
          style={{ animation: 'biSlideUp 0.25s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-7 h-7 text-black/20" />
          </div>
          <h2 className="text-h2 font-bold text-black/80 mb-2">No business info yet</h2>
          <p className="text-body text-black/40 mb-7 max-w-[340px] mx-auto leading-relaxed">This client hasn&apos;t completed the onboarding form on the client app yet.</p>
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-black/[0.04] text-black/50 text-body font-medium hover:bg-black/[0.07] transition-colors">Close</button>
        </div>
        <style jsx>{`
          @keyframes biSlideUp {
            from { transform: translateY(12px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Shared values
  const companyName = ecomInfo?.companyName || leadGenInfo?.companyName || client.name;
  const industry = ecomInfo?.industry || leadGenInfo?.industry || '';
  const websiteUrl = ecomInfo?.website || leadGenInfo?.website || '';

  // Build tabs based on client type
  const tabs = isLeadGen
    ? [
        { key: 'basic' as const, label: 'Basic Info', icon: Building2 },
        { key: 'competitors' as const, label: 'Competitors', icon: Crosshair },
        { key: 'funnel' as const, label: 'Lead Funnel', icon: Zap },
      ]
    : [
        { key: 'basic' as const, label: 'Basic Info', icon: Building2 },
        { key: 'competitors' as const, label: 'Competitors', icon: Crosshair },
        { key: 'products' as const, label: 'Products & USPs', icon: Package },
      ];

  // Reusable field card component
  const FieldCard = ({ label, value, accent: fieldAccent, isBold }: { label: string; value: string; accent?: boolean; isBold?: boolean }) => (
    <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
      <label className="text-caption text-black/35 font-medium block mb-1">{label}</label>
      <p className={`text-body font-medium ${fieldAccent ? `text-[${accent}]` : 'text-black/75'} ${isBold ? 'font-semibold' : ''}`}>{value}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bi-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[780px] max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: 'biSlideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-7 pt-6 pb-0">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${accentBg} flex items-center justify-center flex-shrink-0`}>
                <Building2 className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 id="bi-modal-title" className="text-h2 font-bold text-black/90">{companyName}</h2>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                    style={{
                      color: accent,
                      backgroundColor: isLeadGen ? 'rgba(124,58,237,0.06)' : 'rgba(32,76,199,0.06)',
                      borderColor: isLeadGen ? 'rgba(124,58,237,0.12)' : 'rgba(32,76,199,0.12)',
                    }}
                  >
                    {isLeadGen ? 'Lead Gen' : 'E-Commerce'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-caption text-black/40">{industry}</span>
                  <span className="text-black/15">·</span>
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-caption font-medium flex items-center gap-1 hover:underline transition-colors" style={{ color: accent }}>
                    {websiteUrl.replace('https://', '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
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
                    isActive
                      ? 'bg-white shadow-sm'
                      : 'text-black/30 hover:text-black/50 hover:bg-white/40'
                  }`}
                  style={isActive ? { color: accent } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-black/[0.06] mt-5" />

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* ══════════ E-COMMERCE BASIC INFO ══════════ */}
          {activeTab === 'basic' && ecomInfo && (
            <div className="space-y-6" style={{ animation: 'biSlideUp 0.15s ease-out' }}>
              {/* Company details in bordered cards */}
              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Building2 className="w-3.5 h-3.5 text-[#204CC7]" />
                  Company Details
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <FieldCard label="Company Name" value={ecomInfo.companyName} />
                  <FieldCard label="Industry" value={ecomInfo.industry} />
                  <FieldCard label="Primary Goal" value={ecomInfo.primaryGoal} />
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Marketing details */}
              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Target className="w-3.5 h-3.5 text-[#204CC7]" />
                  Marketing Details
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                    <label className="text-caption text-black/35 font-medium block mb-1">Target Audience</label>
                    <p className="text-body text-black/70 leading-relaxed">{ecomInfo.targetAudience}</p>
                  </div>
                  <div className="rounded-xl bg-[#EEF1FB]/40 border border-[#204CC7]/8 px-4 py-3.5">
                    <label className="text-caption text-[#204CC7]/50 font-medium block mb-1">Monthly Ad Budget</label>
                    <p className="text-body text-[#204CC7] font-bold">{ecomInfo.monthlyAdBudget}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                  <label className="text-caption text-black/35 font-medium block mb-2">Target Locations</label>
                  <div className="flex flex-wrap gap-2">
                    {ecomInfo.targetLocation.map(loc => (
                      <span key={loc} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-caption text-black/55 font-medium border border-black/[0.05] shadow-sm">
                        <MapPin className="w-3 h-3 text-black/25" />
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ LEAD GEN BASIC INFO ══════════ */}
          {activeTab === 'basic' && leadGenInfo && (
            <div className="space-y-6" style={{ animation: 'biSlideUp 0.15s ease-out' }}>
              {/* Company details */}
              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Building2 className="w-3.5 h-3.5 text-[#7C3AED]" />
                  Company Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <FieldCard label="Company Name" value={leadGenInfo.companyName} />
                  <FieldCard label="Industry" value={leadGenInfo.industry} />
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Lead Generation Details */}
              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Target className="w-3.5 h-3.5 text-[#7C3AED]" />
                  Lead Generation Details
                </h3>
                {/* Primary service — full width highlight card */}
                <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5 mb-3">
                  <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Primary Service Offered</label>
                  <p className="text-body text-black/75 font-semibold">{leadGenInfo.primaryServiceOffered}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5">
                    <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Monthly Ad Budget</label>
                    <p className="text-body text-[#7C3AED] font-bold">{leadGenInfo.monthlyAdBudget}</p>
                  </div>
                  <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5">
                    <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Average Deal Value</label>
                    <p className="text-body text-[#7C3AED] font-bold">{leadGenInfo.averageDealValue}</p>
                  </div>
                  <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5">
                    <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Lead Volume / Month</label>
                    <p className="text-body text-[#7C3AED] font-bold">{leadGenInfo.monthlyLeadVolumeTarget}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                  <label className="text-caption text-black/35 font-medium block mb-2">Service Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {leadGenInfo.serviceAreas.map(area => (
                      <span key={area} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-caption text-[#7C3AED]/70 font-medium border border-purple-100/60 shadow-sm">
                        <MapPin className="w-3 h-3 text-[#7C3AED]/40" />
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ COMPETITORS — E-COMMERCE ══════════ */}
          {activeTab === 'competitors' && ecomInfo && (
            <div className="space-y-3" style={{ animation: 'biSlideUp 0.15s ease-out' }}>
              <p className="text-caption text-black/30 mb-1">{ecomInfo.competitors.length} competitor{ecomInfo.competitors.length !== 1 ? 's' : ''} tracked</p>
              {ecomInfo.competitors.map((comp, i) => (
                <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-lg bg-black/[0.03] flex items-center justify-center text-caption font-bold text-black/25">{i + 1}</span>
                      <div>
                        <p className="text-body text-black/80 font-semibold">{comp.name}</p>
                        <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-caption text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 mt-0.5 transition-colors">
                          {comp.website.replace('https://', '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    {i === 0 && (
                      <span className="text-[11px] text-black/30 font-semibold bg-black/[0.035] px-2.5 py-1 rounded-lg">Primary</span>
                    )}
                  </div>
                </div>
              ))}
              {ecomInfo.competitors.length === 0 && (
                <p className="text-center text-caption text-black/25 py-10">No competitors listed</p>
              )}
            </div>
          )}

          {/* ══════════ COMPETITORS — LEAD GEN ══════════ */}
          {activeTab === 'competitors' && leadGenInfo && (
            <div className="space-y-3" style={{ animation: 'biSlideUp 0.15s ease-out' }}>
              <p className="text-caption text-black/30 mb-1">{leadGenInfo.competitors.length} competitor{leadGenInfo.competitors.length !== 1 ? 's' : ''} tracked</p>
              {leadGenInfo.competitors.map((comp, i) => (
                <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-lg bg-purple-50/70 flex items-center justify-center text-caption font-bold text-[#7C3AED]/40">{i + 1}</span>
                      <div>
                        <p className="text-body text-black/80 font-semibold">{comp.name}</p>
                        <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-caption text-[#7C3AED]/70 hover:text-[#7C3AED] flex items-center gap-1 mt-0.5 transition-colors">
                          {comp.website.replace('https://', '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    {i === 0 && (
                      <span className="text-[11px] text-[#7C3AED]/50 font-semibold bg-purple-50/60 px-2.5 py-1 rounded-lg border border-purple-100/50">Primary</span>
                    )}
                  </div>
                  {/* Key Offering row */}
                  <div className="mt-3 ml-[46px] rounded-lg bg-black/[0.02] border border-black/[0.04] px-3.5 py-2.5">
                    <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#FDAB3D]/70 mt-0.5 flex-shrink-0" />
                      <div>
                        <label className="text-[11px] text-black/30 font-semibold uppercase tracking-wide block mb-0.5">Key Offering</label>
                        <p className="text-caption text-black/60 leading-relaxed">{comp.keyOffering}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {leadGenInfo.competitors.length === 0 && (
                <p className="text-center text-caption text-black/25 py-10">No competitors listed</p>
              )}
            </div>
          )}

          {/* ══════════ PRODUCTS & USPs — E-COMMERCE ══════════ */}
          {activeTab === 'products' && ecomInfo && (
            <div className="space-y-6" style={{ animation: 'biSlideUp 0.15s ease-out' }}>
              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Package className="w-3.5 h-3.5 text-[#204CC7]" />
                  Products ({ecomInfo.products.length})
                </h3>
                <div className="space-y-3">
                  {ecomInfo.products.map((prod, i) => (
                    <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-[#EEF1FB] flex items-center justify-center">
                          <Package className="w-4 h-4 text-[#204CC7]" />
                        </div>
                        <span className="text-body text-black/80 font-bold">{prod.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 ml-12 mb-3">
                        <div className="rounded-lg bg-black/[0.02] border border-black/[0.04] px-3 py-2">
                          <label className="text-[11px] text-black/30 font-semibold uppercase tracking-wide">Category</label>
                          <p className="text-caption text-black/65 font-medium mt-0.5">{prod.category}</p>
                        </div>
                        <div className="rounded-lg bg-black/[0.02] border border-black/[0.04] px-3 py-2">
                          <label className="text-[11px] text-black/30 font-semibold uppercase tracking-wide">Price Range</label>
                          <p className="text-caption text-black/65 font-medium mt-0.5">{prod.priceRange}</p>
                        </div>
                      </div>
                      {prod.description && (
                        <p className="text-caption text-black/45 leading-relaxed ml-12">{prod.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Star className="w-3.5 h-3.5 text-[#FDAB3D]" />
                  Unique Selling Points ({ecomInfo.usps.length})
                </h3>
                <div className="space-y-2">
                  {ecomInfo.usps.map((usp, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50/40 border border-amber-100/50">
                      <span className="w-6 h-6 rounded-lg bg-[#FDAB3D]/10 flex items-center justify-center text-[11px] font-bold text-[#FDAB3D] flex-shrink-0 mt-px">{i + 1}</span>
                      <p className="text-body text-black/65 font-medium leading-relaxed">{usp}</p>
                    </div>
                  ))}
                  {ecomInfo.usps.length === 0 && (
                    <p className="text-center text-caption text-black/25 py-8">No USPs listed</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ LEAD FUNNEL — LEAD GEN ══════════ */}
          {activeTab === 'funnel' && leadGenInfo && (
            <div className="space-y-7" style={{ animation: 'biSlideUp 0.15s ease-out' }}>

              {/* Services You Offer */}
              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Briefcase className="w-3.5 h-3.5 text-[#7C3AED]" />
                  Services You Offer ({leadGenInfo.services.length})
                </h3>
                <div className="space-y-3">
                  {leadGenInfo.services.map((svc, i) => (
                    <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-50/70 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-[#7C3AED]/70" />
                        </div>
                        <span className="text-body text-black/80 font-bold">{svc.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 ml-12">
                        <div className="rounded-lg bg-purple-50/30 border border-[#7C3AED]/6 px-3 py-2">
                          <label className="text-[11px] text-[#7C3AED]/40 font-semibold uppercase tracking-wide">Avg. Deal Value</label>
                          <p className="text-caption text-[#7C3AED] font-bold mt-0.5">{svc.avgDealValue}</p>
                        </div>
                        <div className="rounded-lg bg-black/[0.02] border border-black/[0.04] px-3 py-2">
                          <label className="text-[11px] text-black/30 font-semibold uppercase tracking-wide">Avg. Sales Cycle</label>
                          <p className="text-caption text-black/65 font-medium mt-0.5">{svc.avgSalesCycle}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Lead Qualification Criteria */}
              <div>
                <h3 className="text-body font-bold text-black/65 mb-1 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <Filter className="w-3.5 h-3.5 text-[#FDAB3D]" />
                  Lead Qualification Criteria
                </h3>
                <p className="text-caption text-black/30 mb-3.5">Which signals indicate a quality lead?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {leadGenInfo.leadQualificationCriteria.map((crit, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        crit.active
                          ? 'bg-[#EEF1FB]/40 border-[#204CC7]/12 shadow-sm'
                          : 'bg-black/[0.012] border-black/[0.04]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        crit.active
                          ? 'bg-[#204CC7] text-white'
                          : 'bg-black/[0.06]'
                      }`}>
                        {crit.active && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-body font-medium ${crit.active ? 'text-black/70' : 'text-black/30'}`}>
                        {crit.label}
                      </span>
                      {crit.active && (
                        <Zap className="w-3.5 h-3.5 text-[#204CC7]/30 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Follow-up Channels */}
              <div>
                <h3 className="text-body font-bold text-black/65 mb-3.5 flex items-center gap-2 uppercase tracking-wide" style={{ fontSize: '11px' }}>
                  <MessageCircle className="w-3.5 h-3.5 text-[#00C875]" />
                  Follow-up Channels
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {leadGenInfo.followUpChannels.map(channel => {
                    const channelIcon: Record<string, typeof Phone> = {
                      'Phone Call': Phone,
                      'WhatsApp': MessageCircle,
                      'Email': Send,
                      'Video Call': Camera,
                      'Site Visit': MapPin,
                      'LinkedIn': Globe,
                      'SMS': MessageSquareText,
                      'Instagram DM': Eye,
                    };
                    const ChannelIcon = channelIcon[channel] || MessageCircle;
                    return (
                      <span
                        key={channel}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50/40 border border-emerald-100/50 rounded-xl text-body text-black/60 font-medium shadow-sm"
                      >
                        <ChannelIcon className="w-4 h-4 text-[#00C875]/70" />
                        {channel}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer — Smart Nudge Banner or Simple Close ── */}
        <div className="h-px bg-black/[0.06]" />
        {showNudgeBanner ? (
          <div className="px-7 py-4">
            <div className="flex items-center justify-between gap-4 bg-amber-50/70 border border-amber-200/50 rounded-xl px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-100/80 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-[18px] h-[18px] text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-body text-amber-900/80 font-semibold">
                    {pendingItems.length > 0
                      ? `${pendingItems.length} section${pendingItems.length !== 1 ? 's' : ''} incomplete in business profile`
                      : `Onboarding ${client.onboardingStatus === 'Pending' ? 'not started' : 'in progress'}`
                    }
                  </p>
                  <p className="text-caption text-amber-700/50 mt-0.5 truncate">
                    {pendingItems.length > 0
                      ? `${[...new Set(pendingItems.map(i => i.category))].join(' · ')} need client input`
                      : 'Business information submission still pending from client'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNudgeOverlay(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-body font-semibold transition-all shadow-sm hover:shadow flex-shrink-0"
                style={{ backgroundColor: '#D97706' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#B45309')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D97706')}
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
              <span className="font-medium">Onboarding complete — all sections filled</span>
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
            style={{ animation: 'biSlideUp 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success State */}
            {nudgeSent ? (
              <div className="flex flex-col items-center justify-center py-16 px-8" style={{ animation: 'biSlideUp 0.25s ease-out' }}>
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
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isLeadGen ? '#7C3AED10' : '#204CC710' }}>
                        <Megaphone className="w-5 h-5" style={{ color: accent }} />
                      </div>
                      <div>
                        <h3 className="text-h3 font-bold text-black/85">Send Onboarding Reminder</h3>
                        <p className="text-caption text-black/35 mt-0.5">Encourage {companyName} to complete their setup</p>
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
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}15` }}>
                        <Hash className="w-3.5 h-3.5" style={{ color: accent }} />
                      </div>
                      <span className="text-body text-black/70 font-semibold">{clientChannelSlug}</span>
                      <span className="text-caption text-black/25 ml-1">Client Channel</span>
                      <ExternalLink className="w-3 h-3 text-black/20 ml-auto" />
                    </div>
                  </div>

                  {/* Pending Items */}
                  {pendingItems.length > 0 ? (
                    <div>
                      <label className="text-[11px] font-semibold text-black/40 uppercase tracking-wide block mb-2">Incomplete sections flagged ({pendingItems.length})</label>
                      <div className="space-y-1.5">
                        {pendingItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60">
                            <ClockIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-body text-amber-900/70 font-medium flex-1 min-w-0 truncate">{item.label}</span>
                            <span className="text-[11px] text-amber-600/50 font-medium flex-shrink-0">{item.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : onboardingIncomplete && (
                    <div>
                      <label className="text-[11px] font-semibold text-black/40 uppercase tracking-wide block mb-2">Onboarding status</label>
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-body text-amber-900/70 font-medium">Business information form — {client.onboardingStatus}</span>
                      </div>
                    </div>
                  )}

                  {/* Message Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold text-black/40 uppercase tracking-wide">Message preview</label>
                      <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: `${accent}90` }}>
                        <Sparkles className="w-3 h-3" />
                        Auto-generated
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/[0.015] border border-black/[0.05] px-5 py-4">
                      <pre className="text-body text-black/60 leading-relaxed whitespace-pre-wrap font-sans">{generatePMNudgeMessage()}</pre>
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
                      onClick={handlePMSendNudge}
                      disabled={nudgeSending}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-body font-semibold transition-all shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#D97706' }}
                      onMouseEnter={e => !nudgeSending && (e.currentTarget.style.backgroundColor = '#B45309')}
                      onMouseLeave={e => !nudgeSending && (e.currentTarget.style.backgroundColor = '#D97706')}
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

      <style jsx>{`
        @keyframes biSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ────────────── Growth Plan Modal ──────────────
function GrowthPlanModal({ client, onClose, onStatusChange }: {
  client: Client;
  onClose: () => void;
  onStatusChange: (clientId: string, status: GrowthPlanStatus) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const viewMonth = today.getMonth();
  const viewYear = today.getFullYear();

  // Compute dynamic week ranges from planStartDate
  const weekRanges = useMemo(() => {
    if (!client.planStartDate) return [];
    return computeWeekRanges(client.planStartDate, viewMonth, viewYear);
  }, [client.planStartDate, viewMonth, viewYear]);

  // Find the current week index (the one that contains today), default to 0
  const currentWeekIdx = useMemo(() => {
    const idx = weekRanges.findIndex(w => w.isCurrent);
    return idx >= 0 ? idx : 0;
  }, [weekRanges]);

  const [activeWeek, setActiveWeek] = useState<number>(currentWeekIdx);
  const [plan, setPlan] = useState<GrowthPlanData>(() => {
    const seed = seedGrowthPlans[client.id];
    if (seed) return seed;
    // Create empty plan entries for each week range
    const empty: GrowthPlanData = {};
    weekRanges.forEach(w => { empty[w.index] = { whatsHappening: '', tasks: [] }; });
    return empty;
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingHappening, setEditingHappening] = useState(false);
  const [happeningDraft, setHappeningDraft] = useState('');
  const addTaskRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (showAddTask) setTimeout(() => addTaskRef.current?.focus(), 50);
  }, [showAddTask]);

  // Ensure plan has entries for all week ranges (handles month navigation edge cases)
  useEffect(() => {
    setPlan(prev => {
      let updated = false;
      const next = { ...prev };
      weekRanges.forEach(w => {
        if (!next[w.index]) {
          next[w.index] = { whatsHappening: '', tasks: [] };
          updated = true;
        }
      });
      return updated ? next : prev;
    });
  }, [weekRanges]);

  // Safe access: if no week ranges (kickoff not done), show a placeholder
  const hasWeeks = weekRanges.length > 0;
  const weekData = plan[activeWeek] || { whatsHappening: '', tasks: [] };
  const allTasks = Object.values(plan).flatMap(w => w.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.done).length;
  const monthProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const weekTasks = weekData.tasks;
  const weekDone = weekTasks.filter(t => t.done).length;
  const weekPending = weekTasks.length - weekDone;

  const [taskFilter, setTaskFilter] = useState<'all' | 'done' | 'pending'>('all');
  const filteredTasks = taskFilter === 'all' ? weekTasks
    : taskFilter === 'done' ? weekTasks.filter(t => t.done)
    : weekTasks.filter(t => !t.done);

  const toggleTask = (taskId: string) => {
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, tasks: week.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) },
      };
    });
  };

  const removeTask = (taskId: string) => {
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, tasks: week.tasks.filter(t => t.id !== taskId) },
      };
    });
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: GrowthPlanTask = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      done: false,
    };
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, tasks: [...week.tasks, newTask] },
      };
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowAddTask(false);
  };

  const saveHappening = () => {
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, whatsHappening: happeningDraft.trim() },
      };
    });
    setEditingHappening(false);
  };

  const handleSendToClient = () => {
    onStatusChange(client.id, 'Sent');
    onClose();
  };

  const hasContent = totalTasks > 0 || Object.values(plan).some(w => w.whatsHappening.trim());

  // Compute status from plan content
  useEffect(() => {
    if (hasContent && client.growthPlanStatus === 'Not Started') {
      onStatusChange(client.id, 'In Progress');
    }
  }, [hasContent, client.growthPlanStatus, client.id, onStatusChange]);

  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = `${MONTHS_SHORT[viewMonth]} ${viewYear}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gp-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[88vh] flex flex-col overflow-hidden"
        style={{ animation: 'gpSlideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-0">
          {/* Top row: icon + title + close */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EEF1FB] flex items-center justify-center">
                <CalendarCheck2 className="w-[18px] h-[18px] text-[#204CC7]" />
              </div>
              <div>
                <h2 id="gp-modal-title" className="text-[18px] font-bold text-black/90 leading-none">{client.name}</h2>
                <p className="text-caption text-black/40 mt-1">Growth Plan · {monthLabel} · {doneTasks}/{totalTasks} tasks</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors -mr-1" aria-label="Close">
              <X className="w-4 h-4 text-black/35" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-caption text-black/40 font-medium">Monthly progress</span>
              <span className="text-caption font-bold text-[#204CC7]">{monthProgress}%</span>
            </div>
            <div className="h-[5px] bg-black/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-[#204CC7] rounded-full transition-all duration-500 ease-out" style={{ width: `${monthProgress}%` }} />
            </div>
          </div>

          {/* Week tabs — dynamic, date-anchored */}
          {hasWeeks ? (
            <div className="flex items-stretch bg-black/[0.025] rounded-lg p-[3px] gap-[3px] mb-0">
              {weekRanges.map(wr => {
                const isActive = activeWeek === wr.index;
                return (
                  <button
                    key={wr.index}
                    onClick={() => { setActiveWeek(wr.index); setTaskFilter('all'); setShowAddTask(false); setExpandedTask(null); }}
                    className={`flex-1 py-1.5 rounded-md text-caption font-semibold transition-all text-center relative ${
                      isActive
                        ? 'bg-white text-[#204CC7] shadow-sm'
                        : 'text-black/35 hover:text-black/55 hover:bg-white/40'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {wr.isCurrent && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#204CC7]' : 'bg-black/20'}`} />}
                      Wk {wr.index + 1}
                    </span>
                    <span className={`block text-[11px] font-medium leading-none mt-0.5 ${isActive ? 'opacity-60' : 'opacity-40'}`}>{wr.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-3 text-center text-caption text-black/30">
              Complete kickoff to start planning
            </div>
          )}
        </div>

        <div className="h-px bg-black/[0.05] mt-4" />

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* What's happening card */}
          {editingHappening ? (
            <div className="space-y-2.5">
              <label className="text-caption font-semibold text-[#204CC7] flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5" />
                What&apos;s happening
              </label>
              <textarea
                autoFocus
                value={happeningDraft}
                onChange={(e) => setHappeningDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveHappening(); } }}
                placeholder="Describe this week's focus for the client..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#204CC7]/20 bg-white text-body text-black/80 placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/10 focus:border-[#204CC7]/30 resize-none transition-all"
              />
              <div className="flex items-center gap-2">
                <button onClick={saveHappening} className="px-3.5 py-1.5 rounded-lg bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3fa8] transition-colors">Save</button>
                <button onClick={() => setEditingHappening(false)} className="px-3 py-1.5 rounded-lg text-black/40 text-caption font-medium hover:bg-black/[0.04] transition-colors">Cancel</button>
              </div>
            </div>
          ) : weekData.whatsHappening ? (
            <button
              onClick={() => { setHappeningDraft(weekData.whatsHappening); setEditingHappening(true); }}
              className="w-full text-left px-4 py-3 rounded-xl bg-[#EEF1FB]/50 border border-[#204CC7]/[0.06] hover:border-[#204CC7]/15 transition-all group/wh"
            >
              <p className="text-caption font-semibold text-[#204CC7] mb-1 flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5" />
                What&apos;s happening
                <Pencil className="w-3 h-3 ml-auto text-black/15 opacity-0 group-hover/wh:opacity-100 transition-opacity" />
              </p>
              <p className="text-body text-black/60 leading-relaxed">{weekData.whatsHappening}</p>
            </button>
          ) : (
            <button
              onClick={() => { setHappeningDraft(''); setEditingHappening(true); }}
              className="w-full text-left px-4 py-3 rounded-xl bg-black/[0.015] hover:bg-black/[0.03] transition-all group/wh"
            >
              <p className="text-caption font-medium text-black/25 flex items-center gap-1.5 group-hover/wh:text-black/40 transition-colors">
                <MessageSquareText className="w-3.5 h-3.5" />
                Add a &quot;What&apos;s happening&quot; note for this week...
              </p>
            </button>
          )}

          {/* Divider */}
          <div className="h-px bg-black/[0.04]" />

          {/* Task section header + filters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body font-bold text-black/75">This week&apos;s tasks</h3>
              <div className="flex items-center rounded-lg border border-black/[0.06] overflow-hidden">
                {([
                  { key: 'all' as const, label: 'All', count: weekTasks.length },
                  { key: 'done' as const, label: 'Done', count: weekDone },
                  { key: 'pending' as const, label: 'Pending', count: weekPending },
                ]).map((f, i) => (
                  <button
                    key={f.key}
                    onClick={() => setTaskFilter(f.key)}
                    className={`px-2.5 py-1 text-caption font-medium transition-all ${
                      i > 0 ? 'border-l border-black/[0.06]' : ''
                    } ${
                      taskFilter === f.key
                        ? 'bg-[#EEF1FB] text-[#204CC7] font-semibold'
                        : 'text-black/35 hover:text-black/55 hover:bg-black/[0.02]'
                    }`}
                  >
                    {f.label} {f.count}
                  </button>
                ))}
              </div>
            </div>

            {/* Hint text for empty state */}
            {weekTasks.length === 0 && !showAddTask && taskFilter === 'all' && (
              <p className="text-center text-caption text-black/20 py-6">No tasks added yet — tap below to get started</p>
            )}
            {filteredTasks.length === 0 && weekTasks.length > 0 && !showAddTask && (
              <p className="text-center text-caption text-black/20 py-6">No {taskFilter} tasks this week</p>
            )}

            {/* Task rows */}
            <div className="space-y-px">
              {filteredTasks.map((task, tIdx) => (
                <div key={task.id} className="group/task">
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      expandedTask === task.id ? 'bg-[#EEF1FB]/40' : 'hover:bg-black/[0.02]'
                    } ${tIdx > 0 ? 'border-t border-black/[0.03]' : ''}`}
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                      className={`w-[20px] h-[20px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                        task.done
                          ? 'bg-[#00C875] border-[#00C875] text-white'
                          : 'border-black/12 hover:border-[#204CC7]/30 bg-white'
                      }`}
                      aria-label={task.done ? 'Mark as pending' : 'Mark as done'}
                    >
                      {task.done && <Check className="w-3 h-3" />}
                    </button>

                    {/* Title */}
                    <span className={`flex-1 text-body leading-snug ${
                      task.done ? 'line-through text-black/25' : 'text-black/70 font-medium'
                    }`}>
                      {task.title}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                        className="p-1 rounded-md opacity-0 group-hover/task:opacity-100 hover:bg-rose-50 hover:text-rose-500 text-black/15 transition-all"
                        aria-label="Remove task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown className={`w-3.5 h-3.5 text-black/15 transition-transform ${expandedTask === task.id ? 'rotate-180 text-black/30' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded description */}
                  {expandedTask === task.id && task.description && (
                    <div className="mx-3 mb-1.5 ml-[44px] pl-3 py-2 border-l-2 border-[#204CC7]/10 rounded-r-md bg-[#EEF1FB]/20">
                      <p className="text-body text-black/45 leading-relaxed">{task.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add task */}
            {showAddTask ? (
              <div className="mt-3 p-4 rounded-xl bg-black/[0.015] border border-black/[0.05] space-y-2.5" style={{ animation: 'gpSlideUp 0.15s ease-out' }}>
                <input
                  ref={addTaskRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newTaskTitle.trim()) addTask(); if (e.key === 'Escape') setShowAddTask(false); }}
                  placeholder="Task title"
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.07] bg-white text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/8 transition-all"
                />
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Short description for the client (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.07] bg-white text-body text-black/70 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/8 resize-none transition-all"
                />
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={addTask}
                    disabled={!newTaskTitle.trim()}
                    className={`px-4 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                      newTaskTitle.trim()
                        ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa8]'
                        : 'bg-black/[0.05] text-black/20 cursor-not-allowed'
                    }`}
                  >
                    Add Task
                  </button>
                  <button onClick={() => { setShowAddTask(false); setNewTaskTitle(''); setNewTaskDesc(''); }} className="px-3 py-1.5 rounded-lg text-black/35 text-caption font-medium hover:bg-black/[0.04] transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTask(true)}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/[0.015] hover:bg-[#EEF1FB]/50 hover:text-[#204CC7] text-black/25 transition-all text-caption font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add task
              </button>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="h-px bg-black/[0.05]" />
        <div className="flex items-center justify-between px-6 py-3.5">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-body font-medium text-black/35 hover:text-black/55 hover:bg-black/[0.03] transition-all">
            Close
          </button>
          {client.growthPlanStatus !== 'Sent' && hasContent && (
            <button
              onClick={handleSendToClient}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-body font-semibold bg-[#204CC7] text-white hover:bg-[#1a3fa8] shadow-sm shadow-[#204CC7]/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              Send to Client
            </button>
          )}
          {client.growthPlanStatus === 'Sent' && (
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-caption font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sent to Client
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes gpSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function KickoffModal({ client, mode, onClose, onLaunch, onApprove }: {
  client: Client;
  mode: 'initial' | 'review';
  onClose: () => void;
  onLaunch: (assignments: Record<string, string>, metrics: KickoffMetrics) => void;
  onApprove: (finalMetrics: KickoffMetrics) => void;
}) {
  const businessType: 'ecommerce' | 'leadgen' = client.clientType === 'Ecommerce' ? 'ecommerce' : 'leadgen';
  const fields = getMetricFields(businessType);
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  // ─── INITIAL MODE STATE (3-step wizard) ───
  const [step, setStep] = useState(1);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<KickoffMetrics>({ adSpend: '', roas: '', revenue: '', orders: '', aov: '', leads: '', cpl: '', ctr: '' });

  // ─── REVIEW MODE STATE ───
  const kd = client.kickoffData;
  const hasResponse = kd?.hasClientResponse ?? false;
  const [reviewTab, setReviewTab] = useState<'comparison' | 'team'>(hasResponse ? 'comparison' : 'comparison');
  // Revised metrics = start from client's proposal if exists, else proposed
  const [revisedMetrics, setRevisedMetrics] = useState<KickoffMetrics>(
    kd?.clientMetrics ?? kd?.proposedMetrics ?? { adSpend: '', roas: '', revenue: '', orders: '', aov: '', leads: '', cpl: '', ctr: '' }
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ─── INITIAL MODE: validation ───
  const requiredSlotsFilled = pmRoleSlots.filter(s => s.required).every(s => assignments[s.role]);
  const metricsAllFilled = (m: KickoffMetrics) => businessType === 'ecommerce'
    ? !!(m.adSpend && m.roas && m.revenue && m.orders && m.aov)
    : !!(m.adSpend && m.leads && m.cpl && m.ctr);
  const canProceed = step === 1 ? requiredSlotsFilled : step === 2 ? metricsAllFilled(metrics) : true;

  // ─── REVIEW MODE: split metrics into agreed vs. disputed ───
  const disputedFields = hasResponse ? fields.filter(f => {
    const p = kd?.proposedMetrics[f.key]; const c = kd?.clientMetrics?.[f.key];
    return p && c && p !== c;
  }) : [];
  const agreedFields = hasResponse ? fields.filter(f => {
    const p = kd?.proposedMetrics[f.key]; const c = kd?.clientMetrics?.[f.key];
    return !p || !c || p === c;
  }) : [];
  // Track which metric note is expanded (progressive disclosure)
  const [expandedNote, setExpandedNote] = useState<string | null>(disputedFields.length > 0 ? disputedFields[0].key : null);
  // ─── Discuss-in-Channel flow ───
  const clientChannelName = client.name; // Channel is derived from the client name
  const [discussOpen, setDiscussOpen] = useState<string | null>(null); // metric key with composer open
  const [discussMsg, setDiscussMsg] = useState('');
  const [sentToast, setSentToast] = useState<{ channel: string; metric: string; finalVal: string } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Store last sent discussion payload so handleGoToChannel can pass it to Inbox
  const lastDiscussionRef = useRef<{ message: string; metric: string; proposed: string; client: string; finalTarget: string } | null>(null);

  const handleSendDiscussion = (metricLabel: string, metricKey: keyof KickoffMetrics, prefix?: string, suffix?: string) => {
    if (!discussMsg.trim()) return;
    const finalDisplay = revisedMetrics[metricKey] ? formatMetricVal(revisedMetrics[metricKey], prefix, suffix) : '—';
    const proposedDisplay = client.kickoffData?.proposedMetrics[metricKey] != null
      ? formatMetricVal(client.kickoffData.proposedMetrics[metricKey], prefix, suffix) : '—';
    const clientDisplay = client.kickoffData?.clientMetrics?.[metricKey] != null
      ? formatMetricVal(client.kickoffData.clientMetrics![metricKey], prefix, suffix) : '—';
    lastDiscussionRef.current = {
      message: discussMsg.trim(),
      metric: metricLabel,
      proposed: proposedDisplay,
      client: clientDisplay,
      finalTarget: finalDisplay,
    };
    setSentToast({ channel: clientChannelName, metric: metricLabel, finalVal: finalDisplay });
    setDiscussOpen(null);
    setDiscussMsg('');
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setSentToast(null), 5000);
  };

  const handleGoToChannel = () => {
    // Store discussion data in sessionStorage for Inbox to pick up
    if (lastDiscussionRef.current) {
      const channelId = clientChannelName.toLowerCase().replace(/\s+/g, '-');
      sessionStorage.setItem('inbox_discussion_msg', JSON.stringify({
        channelId,
        ...lastDiscussionRef.current,
        sender: 'You',
      }));
    }
    setSentToast(null);
    onClose();
    const channelId = clientChannelName.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `/inbox?channel=${channelId}`;
  };

  // ─── Reusable: role slot row (initial mode only) ───
  const renderSlotRow = (slot: { role: string; required: boolean }) => {
    const assigned = assignments[slot.role];
    const assignedEmp = pmEmployeePool.find(e => e.id === assigned);
    const isOpen = openDropdown === slot.role;
    const available = pmEmployeePool.filter(e => e.role === slot.role && !Object.values(assignments).includes(e.id));
    return (
      <div key={slot.role} className="relative">
        <button onClick={() => setOpenDropdown(isOpen ? null : slot.role)} aria-expanded={isOpen} aria-haspopup="listbox"
          aria-label={`${slot.role}${assignedEmp ? `, assigned to ${assignedEmp.name}` : ', unassigned'}`}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${assignedEmp ? 'border-[#00C875]/25 bg-[#00C875]/[0.03]' : isOpen ? 'border-[#7C3AED]/25 bg-[#7C3AED]/[0.02]' : 'border-black/[0.06] hover:border-black/[0.1] bg-white'}`}>
          <div className="flex items-center gap-3">
            {assignedEmp ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-bold bg-[#7C3AED]" aria-hidden="true">{getInitials(assignedEmp.name)}</div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-black/[0.03] flex items-center justify-center"><User className="w-3.5 h-3.5 text-black/30" aria-hidden="true" /></div>
            )}
            <div>
              <p className={`text-body font-medium leading-tight ${assignedEmp ? 'text-black/80' : 'text-black/45'}`}>{assignedEmp ? assignedEmp.name : 'Select employee'}</p>
              <p className="text-caption text-black/45 mt-0.5">{slot.role}{slot.required ? <span className="text-[#E2445C]/70 ml-1" aria-label="required">*</span> : ''}</p>
            </div>
          </div>
          {assignedEmp ? (
            <Check className="w-4 h-4 text-[#00C875]" aria-hidden="true" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-black/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          )}
        </button>
        {isOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 max-h-[200px] overflow-y-auto" role="listbox" aria-label={`Employees for ${slot.role}`}>
            {available.length === 0 ? (
              <p className="px-4 py-3 text-caption text-black/30">No available employees</p>
            ) : available.map(emp => (
              <button key={emp.id} role="option" aria-selected={false} onClick={() => { setAssignments(prev => ({ ...prev, [slot.role]: emp.id })); setOpenDropdown(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.025] transition-colors text-left">
                <div className="w-7 h-7 rounded-full bg-black/[0.04] flex items-center justify-center text-caption font-bold text-black/50" aria-hidden="true">{getInitials(emp.name)}</div>
                <span className="text-body text-black/65">{emp.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Reusable: metric input field ───
  const renderMetricInput = (field: MetricFieldDef, m: KickoffMetrics, setM: (fn: (p: KickoffMetrics) => KickoffMetrics) => void, idPrefix: string) => (
    <div key={field.key}>
      <label htmlFor={`${idPrefix}-${field.key}`} className="text-caption font-medium text-black/50 block mb-1.5">{field.label}</label>
      <div className="relative">
        {field.prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body text-black/40" aria-hidden="true">{field.prefix}</span>}
        <input id={`${idPrefix}-${field.key}`} type="text" placeholder={field.placeholder} value={m[field.key]}
          onChange={e => setM(prev => ({ ...prev, [field.key]: e.target.value }))}
          className={`w-full ${field.prefix ? 'pl-7' : 'px-3.5'} ${field.suffix ? 'pr-8' : 'pr-3.5'} py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/30 focus:outline-none focus:border-[#7C3AED]/30 focus:ring-2 focus:ring-[#7C3AED]/8 transition-all bg-white`} />
        {field.suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-caption text-black/40" aria-hidden="true">{field.suffix}</span>}
      </div>
    </div>
  );

  // Accent colour based on mode
  const accent = mode === 'initial' ? '#7C3AED' : '#204CC7';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div role="dialog" aria-modal="true" aria-labelledby="kickoff-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[88vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalSlideUp 0.22s ease-out' }} onClick={(e) => e.stopPropagation()}>


        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h2 id="kickoff-modal-title" className="text-h2 text-black/90 leading-tight truncate">{client.name}</h2>
              {mode === 'review' && hasResponse && disputedFields.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium bg-amber-50 text-amber-600 flex-shrink-0">
                  {disputedFields.length} {disputedFields.length === 1 ? 'change' : 'changes'}
                </span>
              )}
              {mode === 'review' && hasResponse && disputedFields.length === 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium bg-emerald-50 text-emerald-600 flex-shrink-0">
                  <Check className="w-3 h-3" />Agreed
                </span>
              )}
              {mode === 'review' && !hasResponse && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium bg-blue-50 text-blue-500 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Pending
                </span>
              )}
            </div>
            <p className="text-caption text-black/50">
              {businessType === 'ecommerce' ? 'E-Commerce' : 'Lead Generation'} · Performance Marketing
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors -mt-0.5 -mr-1 flex-shrink-0" aria-label="Close modal">
            <X className="w-4 h-4 text-black/30" />
          </button>
        </div>

        {/* ── INITIAL MODE: Step Progress ── */}
        {mode === 'initial' && (
          <div className="px-6 pb-4">
            <div className="flex items-center" role="navigation" aria-label="Kickoff steps">
              {['Assign Team', 'Set Targets', 'Review & Send'].map((label, i) => {
                const stepNum = i + 1; const isActive = step === stepNum; const isDone = step > stepNum;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold transition-all ${isDone ? 'bg-[#00C875] text-white' : isActive ? 'bg-[#7C3AED] text-white' : 'bg-black/[0.06] text-black/45'}`} aria-current={isActive ? 'step' : undefined}>
                        {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : stepNum}
                      </div>
                      <span className={`text-caption font-medium whitespace-nowrap ${isActive ? 'text-black/70' : isDone ? 'text-[#00C875]' : 'text-black/45'}`}>{label}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px mx-3 transition-colors ${isDone ? 'bg-[#00C875]/50' : 'bg-black/[0.06]'}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REVIEW MODE: Tab bar ── */}
        {mode === 'review' && (
          <div className="px-6">
            <div className="flex gap-0" role="tablist" aria-label="Review sections">
              {([
                { id: 'comparison' as const, label: 'Targets', icon: <Target className="w-3.5 h-3.5" aria-hidden="true" /> },
                { id: 'team' as const, label: 'Team', icon: <Users className="w-3.5 h-3.5" aria-hidden="true" /> },
              ]).map(tab => (
                <button key={tab.id} role="tab" aria-selected={reviewTab === tab.id} onClick={() => setReviewTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-caption font-medium border-b-2 transition-all ${
                    reviewTab === tab.id ? 'border-[#204CC7] text-[#204CC7]' : 'border-transparent text-black/45 hover:text-black/60'
                  }`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-black/[0.06]" />

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ═══ INITIAL MODE STEPS ═══ */}
          {mode === 'initial' && step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-h3 text-black/80 mb-1">Assign Service Team</h3>
                <p className="text-body text-black/40">Select team members who will manage campaigns and creatives.</p>
              </div>
              <div className="space-y-2">{pmRoleSlots.map(slot => renderSlotRow(slot))}</div>
            </div>
          )}

          {mode === 'initial' && step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-h3 text-black/80 mb-1">Propose Monthly Targets</h3>
                <p className="text-body text-black/40">Set targets for the client to review. They can accept or suggest changes.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {fields.map(f => renderMetricInput(f, metrics, setMetrics, 'km'))}
              </div>
            </div>
          )}

          {mode === 'initial' && step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-h3 text-black/80 mb-1">Review &amp; Send</h3>
                <p className="text-body text-black/40">Confirm everything looks good before sending to the client.</p>
              </div>

              {/* Team summary */}
              <div>
                <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-2.5">Team</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(assignments).filter(([, v]) => v).map(([role, empId]) => {
                    const emp = pmEmployeePool.find(e => e.id === empId);
                    return emp ? (
                      <div key={role} className="flex items-center gap-2 px-2.5 py-1.5 bg-black/[0.02] rounded-lg border border-black/[0.05]">
                        <div className="w-6 h-6 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-caption font-bold" aria-hidden="true">{getInitials(emp.name)}</div>
                        <span className="text-caption font-medium text-black/65">{emp.name}</span>
                        <span className="text-caption text-black/45">{role}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Targets summary */}
              <div>
                <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-2.5">Targets</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {fields.map(f => metrics[f.key] && (
                    <div key={f.key} className="p-3 rounded-lg bg-black/[0.015] border border-black/[0.04]">
                      <p className="text-caption text-black/45 mb-0.5">{f.label}</p>
                      <p className="text-body font-semibold text-black/70">{formatMetricVal(metrics[f.key], f.prefix, f.suffix)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#204CC7]/[0.03] border border-[#204CC7]/[0.08]">
                <MessageSquareText className="w-4 h-4 text-[#204CC7]/50 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-caption text-[#204CC7]/70 leading-relaxed">The client can review and either accept these targets or propose preferred numbers with a note.</p>
              </div>
            </div>
          )}

          {/* ═══ REVIEW MODE: Target Review Tab ═══ */}
          {mode === 'review' && reviewTab === 'comparison' && kd && (
            <div className="space-y-5" role="tabpanel" aria-label="Targets">

              {/* ── Waiting state ── */}
              {!hasResponse && (
                <>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/[0.015] border border-black/[0.05]">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-500" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-body font-medium text-black/70">Waiting for client response</p>
                      <p className="text-caption text-black/45 mt-0.5">Targets sent. The client can accept or suggest changes.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-2.5">Proposed Targets</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {fields.map(f => kd.proposedMetrics[f.key] && (
                        <div key={f.key} className="p-3 rounded-lg bg-black/[0.015] border border-black/[0.04]">
                          <p className="text-caption text-black/45 mb-0.5">{f.label}</p>
                          <p className="text-body font-semibold text-black/70">{formatMetricVal(kd.proposedMetrics[f.key], f.prefix, f.suffix)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Client responded: disputed metrics ── */}
              {hasResponse && disputedFields.length > 0 && (
                <div>
                  <p className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-3">
                    Needs review <span className="text-amber-500 font-bold ml-1">{disputedFields.length}</span>
                  </p>
                  <div className="space-y-2">
                    {disputedFields.map(f => {
                      const proposed = kd.proposedMetrics[f.key];
                      const clientVal = kd.clientMetrics?.[f.key] ?? '';
                      const note = kd.clientNotes?.[f.key];
                      const isExpanded = expandedNote === f.key;
                      return (
                        <div key={f.key}
                          className={`rounded-xl border transition-all ${isExpanded ? 'border-black/[0.08] bg-white shadow-sm shadow-black/[0.04]' : 'border-black/[0.05] bg-white hover:border-black/[0.1]'}`}>
                          {/* Collapsed row */}
                          <button onClick={() => setExpandedNote(isExpanded ? null : f.key)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left gap-4" aria-expanded={isExpanded} aria-label={`${f.label}: proposed ${formatMetricVal(proposed, f.prefix, f.suffix)}, client prefers ${formatMetricVal(clientVal, f.prefix, f.suffix)}`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isExpanded ? 'bg-amber-400' : 'bg-amber-300'}`} />
                              <p className="text-body font-medium text-black/75">{f.label}</p>
                              {note && !isExpanded && <MessageSquareText className="w-3 h-3 text-black/40 flex-shrink-0" aria-hidden="true" />}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-body text-black/45 tabular-nums line-through decoration-black/20">{formatMetricVal(proposed, f.prefix, f.suffix)}</span>
                              <span className="text-body font-semibold text-black/80 tabular-nums">{formatMetricVal(clientVal, f.prefix, f.suffix)}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-black/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </div>
                          </button>

                          {/* Expanded */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3">
                              {/* Three-column comparison: Proposed → Client → Final */}
                              <div className="flex items-stretch gap-2">
                                <div className="flex-1 p-2.5 rounded-lg bg-black/[0.02] border border-black/[0.04]">
                                  <p className="text-caption text-black/40 mb-0.5">Brego proposed</p>
                                  <p className="text-body font-semibold text-black/50 tabular-nums">{formatMetricVal(proposed, f.prefix, f.suffix)}</p>
                                </div>
                                <div className="flex items-center"><ArrowRight className="w-3 h-3 text-black/15" aria-hidden="true" /></div>
                                <div className="flex-1 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/30">
                                  <p className="text-caption text-amber-600/80 mb-0.5">Client wants</p>
                                  <p className="text-body font-semibold text-amber-700 tabular-nums">{formatMetricVal(clientVal, f.prefix, f.suffix)}</p>
                                </div>
                                <div className="flex items-center"><ArrowRight className="w-3 h-3 text-black/15" aria-hidden="true" /></div>
                                <div className="flex-1 p-2.5 rounded-lg bg-[#204CC7]/[0.04] border border-[#204CC7]/[0.12]">
                                  <label htmlFor={`rv-${f.key}`} className="text-caption text-[#204CC7]/60 mb-0.5 block">Final target</label>
                                  <div className="relative">
                                    {f.prefix && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-body text-[#204CC7]/30" aria-hidden="true">{f.prefix}</span>}
                                    <input id={`rv-${f.key}`} type="text" value={revisedMetrics[f.key]}
                                      onChange={e => setRevisedMetrics(prev => ({ ...prev, [f.key]: e.target.value }))}
                                      className={`w-full ${f.prefix ? 'pl-4' : ''} ${f.suffix ? 'pr-5' : ''} py-0 text-body font-semibold text-[#204CC7] tabular-nums bg-transparent border-none focus:outline-none placeholder:text-[#204CC7]/25`}
                                      placeholder="Set"
                                    />
                                    {f.suffix && <span className="absolute right-0 top-1/2 -translate-y-1/2 text-caption text-[#204CC7]/30" aria-hidden="true">{f.suffix}</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Client note */}
                              {note && (
                                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-black/[0.015]">
                                  <MessageSquareText className="w-3.5 h-3.5 text-black/30 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                  <p className="text-caption text-black/50 leading-relaxed italic">&ldquo;{note}&rdquo;</p>
                                </div>
                              )}

                              {/* Discuss in Channel — inline composer or CTA */}
                              {discussOpen !== f.key ? (
                                <button
                                  onClick={() => { setDiscussOpen(f.key); setDiscussMsg(''); setTimeout(() => composerRef.current?.focus(), 50); }}
                                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-black/[0.08] text-caption font-medium text-black/40 hover:text-[#204CC7] hover:border-[#204CC7]/20 hover:bg-[#204CC7]/[0.02] transition-all"
                                  aria-label={`Discuss ${f.label} in ${clientChannelName} channel`}
                                >
                                  <Hash className="w-3 h-3" aria-hidden="true" />
                                  Discuss in {clientChannelName}
                                </button>
                              ) : (
                                <div className="rounded-xl border border-[#204CC7]/12 bg-white overflow-hidden shadow-sm shadow-black/[0.03]">
                                  {/* Composer header */}
                                  <div className="flex items-center justify-between px-3.5 py-2 bg-[#204CC7]/[0.025] border-b border-[#204CC7]/8">
                                    <div className="flex items-center gap-1.5">
                                      <Hash className="w-3.5 h-3.5 text-[#204CC7]/40" aria-hidden="true" />
                                      <span className="text-caption font-medium text-[#204CC7]/60">{clientChannelName}</span>
                                    </div>
                                    <button onClick={() => { setDiscussOpen(null); setDiscussMsg(''); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.05] transition-colors" aria-label="Cancel">
                                      <X className="w-3 h-3 text-black/30" />
                                    </button>
                                  </div>

                                  {/* Auto-attached context card — shows all three values */}
                                  <div className="mx-3.5 mt-3 p-2.5 rounded-lg bg-black/[0.015] border border-black/[0.04]">
                                    <div className="flex items-center gap-3 text-caption tabular-nums">
                                      <span className="font-semibold text-black/60">{f.label}</span>
                                      <span className="text-black/30">·</span>
                                      <span className="text-black/40">Proposed {formatMetricVal(proposed, f.prefix, f.suffix)}</span>
                                      <span className="text-black/20">→</span>
                                      <span className="text-amber-600">Client {formatMetricVal(clientVal, f.prefix, f.suffix)}</span>
                                      <span className="text-black/20">→</span>
                                      <span className="font-semibold text-[#204CC7]">Final {revisedMetrics[f.key] ? formatMetricVal(revisedMetrics[f.key], f.prefix, f.suffix) : '—'}</span>
                                    </div>
                                  </div>

                                  {/* Textarea + send */}
                                  <div className="px-3.5 pt-2.5 pb-3">
                                    <textarea
                                      ref={composerRef}
                                      value={discussMsg}
                                      onChange={e => setDiscussMsg(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDiscussion(f.label, f.key, f.prefix, f.suffix); } }}
                                      placeholder="Add context for the team..."
                                      rows={2}
                                      className="w-full text-body text-black/70 placeholder:text-black/30 bg-transparent border-none resize-none focus:outline-none leading-relaxed"
                                    />
                                    <div className="flex items-center justify-between mt-1.5">
                                      <p className="text-caption text-black/30">Enter to send</p>
                                      <button
                                        onClick={() => handleSendDiscussion(f.label, f.key, f.prefix, f.suffix)}
                                        disabled={!discussMsg.trim()}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all ${discussMsg.trim() ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa3] shadow-sm shadow-[#204CC7]/20' : 'bg-black/[0.04] text-black/30 cursor-not-allowed'}`}
                                        aria-label="Send to channel"
                                      >
                                        <Send className="w-3 h-3" aria-hidden="true" />Send
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Agreed metrics ── */}
              {hasResponse && (() => {
                const agreed = agreedFields.filter(f => !!kd.proposedMetrics[f.key]);
                return agreed.length > 0 ? (
                  <div>
                    <p className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-2.5">
                      Agreed <span className="text-[#00C875] font-bold ml-1">{agreed.length}</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {agreed.map(f => (
                        <div key={f.key} className="flex items-center justify-between p-2.5 rounded-lg bg-black/[0.01] border border-black/[0.04]">
                          <span className="text-caption text-black/40">{f.label}</span>
                          <span className="text-caption font-semibold text-black/60 tabular-nums">{formatMetricVal(kd.proposedMetrics[f.key], f.prefix, f.suffix)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* ── All agreed message ── */}
              {hasResponse && disputedFields.length === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00C875]/[0.04] border border-[#00C875]/[0.12]">
                  <div className="w-9 h-9 rounded-full bg-[#00C875]/10 flex items-center justify-center flex-shrink-0">
                    <CircleCheck className="w-4 h-4 text-[#00C875]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-black/70">All targets agreed</p>
                    <p className="text-caption text-black/50 mt-0.5">The client accepted all proposed targets. Ready to finalize.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ REVIEW MODE: Team Tab ═══ */}
          {mode === 'review' && reviewTab === 'team' && kd && (
            <div className="space-y-2" role="tabpanel" aria-label="Team">
              {Object.entries(kd.assignments).filter(([, v]) => v).map(([role, empId]) => {
                const emp = pmEmployeePool.find(e => e.id === empId);
                return emp ? (
                  <div key={role} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.05] bg-white">
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-caption font-bold flex-shrink-0" aria-hidden="true">{getInitials(emp.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-black/75 truncate">{emp.name}</p>
                      <p className="text-caption text-black/45">{role}</p>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="h-px bg-black/[0.06]" />
        <div className="flex items-center justify-between px-6 py-3.5">
          {mode === 'initial' ? (
            <>
              {step > 1 ? (
                <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-body font-medium text-black/40 hover:text-black/60 hover:bg-black/[0.025] transition-all" aria-label="Go back">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />Back
                </button>
              ) : (
                <button onClick={onClose} className="px-3 py-2 rounded-lg text-body font-medium text-black/40 hover:text-black/60 hover:bg-black/[0.025] transition-all">Cancel</button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!canProceed} aria-disabled={!canProceed}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold transition-all ${canProceed ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-sm shadow-[#7C3AED]/20' : 'bg-black/[0.04] text-black/30 cursor-not-allowed'}`}>
                  Continue<ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button onClick={() => onLaunch(assignments, metrics)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-sm shadow-[#7C3AED]/20 transition-all">
                  <Send className="w-4 h-4" aria-hidden="true" />Send to Client
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-3 py-2 rounded-lg text-body font-medium text-black/40 hover:text-black/60 hover:bg-black/[0.025] transition-all">Close</button>
              {hasResponse && reviewTab === 'comparison' && (
                <button onClick={() => onApprove(revisedMetrics)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold bg-[#00C875] text-white hover:bg-[#00b368] shadow-sm shadow-[#00C875]/20 transition-all">
                  <Check className="w-4 h-4" aria-hidden="true" />Approve
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Sent-to-channel toast ── */}
        {sentToast && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[340px] rounded-xl bg-[#1a1a1a] text-white shadow-2xl shadow-black/30 overflow-hidden" style={{ animation: 'modalSlideUp 0.2s ease-out' }} role="status" aria-live="polite">
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#00C875]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-[#00C875]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-white/90 leading-tight">Sent to #{sentToast.channel}</p>
                <p className="text-caption text-white/40 mt-0.5">{sentToast.metric} · Final target: {sentToast.finalVal}</p>
              </div>
            </div>
            <button
              onClick={handleGoToChannel}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-white/[0.06] text-caption font-medium text-[#7CB3FF] hover:bg-white/[0.04] transition-colors"
            >
              Go to #{sentToast.channel}<ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes modalSlideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Clock icon needed for review mode waiting state
function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

interface PerformanceMarketingProps {
  onBack?: () => void;
}

export function PerformanceMarketing({ onBack }: PerformanceMarketingProps) {
  const [currentView, setCurrentView] = useState<View>('clientList');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [showClientMenu, setShowClientMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [kickoffClient, setKickoffClient] = useState<Client | null>(null);
  const [kickoffMode, setKickoffMode] = useState<'initial' | 'review'>('initial');
  const [growthPlanClient, setGrowthPlanClient] = useState<Client | null>(null);
  const [businessInfoClient, setBusinessInfoClient] = useState<Client | null>(null);

  const handleGrowthPlanStatusChange = useCallback((clientId: string, status: GrowthPlanStatus) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, growthPlanStatus: status } : c));
    // Also update the growthPlanClient ref if open
    setGrowthPlanClient(prev => prev && prev.id === clientId ? { ...prev, growthPlanStatus: status } : prev);
  }, []);

  const [clientComments, setClientComments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    mockClients.forEach(c => { map[c.id] = c.comments; });
    return map;
  });
  const [clientQCDates, setClientQCDates] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    mockClients.forEach(c => { map[c.id] = c.lastQC; });
    return map;
  });
  const [editingQC, setEditingQC] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<{ clientType: ClientType | 'All'; ksmTarget: KSMStatus | 'All'; team: string; kickoffStatus: KickoffStatus | 'All'; growthPlan: GrowthPlanStatus | 'All'; onboarding: OnboardingStatus | 'All' }>({ clientType: 'All', ksmTarget: 'All', team: 'All', kickoffStatus: 'All', growthPlan: 'All', onboarding: 'All' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const menuRef = useRef<HTMLDivElement>(null);

  // Active filter count
  const activeFilterCount = (filters.clientType !== 'All' ? 1 : 0) + (filters.ksmTarget !== 'All' ? 1 : 0) + (filters.team !== 'All' ? 1 : 0) + (filters.kickoffStatus !== 'All' ? 1 : 0) + (filters.growthPlan !== 'All' ? 1 : 0) + (filters.onboarding !== 'All' ? 1 : 0);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowClientMenu(null);
    };
    if (showClientMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showClientMenu]);

  const filteredClients = useMemo(() => {
    return clients
      .filter(c => {
        if (!c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filters.clientType !== 'All' && c.clientType !== filters.clientType) return false;
        if (filters.kickoffStatus !== 'All' && c.kickoffStatus !== filters.kickoffStatus) return false;
        if (filters.ksmTarget !== 'All' && c.ksmTarget !== filters.ksmTarget) return false;
        if (filters.team !== 'All' && !c.team.some(t => t.initials === filters.team)) return false;
        if (filters.growthPlan !== 'All' && c.growthPlanStatus !== filters.growthPlan) return false;
        if (filters.onboarding !== 'All' && c.onboardingStatus !== filters.onboarding) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
        if (sortField === 'clientType') return a.clientType.localeCompare(b.clientType) * dir;
        if (sortField === 'ksmTarget') return a.ksmTarget.localeCompare(b.ksmTarget) * dir;
        return 0;
      });
  }, [clients, searchQuery, filters, sortField, sortDir]);

  const totalClients = clients.length;
  const hitCount = filteredClients.filter(c => c.ksmTarget === 'Hit').length;
  const missCount = filteredClients.filter(c => c.ksmTarget === 'Miss').length;
  const hitRate = filteredClients.length > 0 ? Math.round((hitCount / filteredClients.length) * 100) : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientMenu(client.id);
  };

  const handleViewSelect = (view: View) => {
    setCurrentView(view);
    setShowClientMenu(null);
  };

  const handleBackToList = () => {
    setCurrentView('clientList');
    setSelectedClient(null);
  };

  // Bulk select helpers
  const allVisibleSelected = filteredClients.length > 0 && filteredClients.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredClients.map(c => c.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const resetFilters = () => setFilters({ clientType: 'All', ksmTarget: 'All', team: 'All', kickoffStatus: 'All', growthPlan: 'All', onboarding: 'All' });

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
                <h1 className="text-black/90 text-h2 font-bold">Performance Marketing</h1>
                <p className="text-black/50 mt-0.5 text-caption font-normal">
                  {filteredClients.length} of {totalClients} clients
                </p>
              </div>
              <div className="w-px h-8 bg-black/8" />
              <MonthNavigator
                monthIdx={selectedMonthIdx}
                year={selectedYear}
                onMonthChange={setSelectedMonthIdx}
                onYearChange={setSelectedYear}
                minYear={2024}
              />
              <PeriodLabel monthIdx={selectedMonthIdx} year={selectedYear} />
            </div>

            {/* Right: Search + Filter + Export */}
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
                  <FilterPanel
                    filters={filters}
                    onChange={setFilters}
                    onClose={() => setShowFilterPanel(false)}
                    onReset={resetFilters}
                    activeCount={activeFilterCount}
                  />
                )}
              </div>

              {/* Export / Share */}
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium" title="Export">
                <Share className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* ── Active Filter Tags ── */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 pb-3 flex-wrap">
              <span className="text-black/55 text-micro font-medium">Active filters:</span>
              {filters.clientType !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF1FB] text-[#3D5EC7] rounded-lg text-caption font-medium">
                  <Tag className="w-3 h-3" />
                  {filters.clientType}
                  <button onClick={() => setFilters(f => ({ ...f, clientType: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.onboarding !== 'All' && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                  filters.onboarding === 'Complete' ? 'bg-emerald-50 text-emerald-700'
                  : filters.onboarding === 'In Progress' ? 'bg-amber-50 text-amber-700'
                  : 'bg-black/[0.04] text-black/60'
                }`}>
                  <Building2 className="w-3 h-3" />
                  {filters.onboarding}
                  <button onClick={() => setFilters(f => ({ ...f, onboarding: 'All' }))} className="hover:bg-black/5 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.ksmTarget !== 'All' && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                  filters.ksmTarget === 'Hit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                }`}>
                  <Target className="w-3 h-3" />
                  {filters.ksmTarget}
                  <button onClick={() => setFilters(f => ({ ...f, ksmTarget: 'All' }))} className="hover:bg-black/5 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.kickoffStatus !== 'All' && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                  filters.kickoffStatus === 'Done' ? 'bg-emerald-50 text-emerald-700'
                  : filters.kickoffStatus === 'Onboarding' ? 'bg-blue-50 text-blue-700'
                  : 'bg-amber-50 text-amber-700'
                }`}>
                  <CircleCheck className="w-3 h-3" />
                  {filters.kickoffStatus}
                  <button onClick={() => setFilters(f => ({ ...f, kickoffStatus: 'All' }))} className="hover:bg-black/5 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.team !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-caption font-medium">
                  <Users className="w-3 h-3" />
                  {[{ initials: 'JD', name: 'Jay Desai' }, { initials: 'AS', name: 'Aarti Shah' }, { initials: 'PM', name: 'Priya Mehta' }, { initials: 'RK', name: 'Rahul Kumar' }].find(t => t.initials === filters.team)?.name || filters.team}
                  <button onClick={() => setFilters(f => ({ ...f, team: 'All' }))} className="hover:bg-violet-100 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.growthPlan !== 'All' && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                  filters.growthPlan === 'Sent' ? 'bg-emerald-50 text-emerald-700'
                  : filters.growthPlan === 'In Progress' ? 'bg-blue-50 text-blue-700'
                  : 'bg-black/[0.04] text-black/60'
                }`}>
                  <CalendarCheck2 className="w-3 h-3" />
                  {filters.growthPlan}
                  <button onClick={() => setFilters(f => ({ ...f, growthPlan: 'All' }))} className="hover:bg-black/5 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={resetFilters} className="text-[#204CC7] hover:underline text-micro font-medium">Clear all</button>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="p-6">

        {/* ── Bulk Action Bar ── */}
        {someSelected && (
          <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-[#204CC7] rounded-xl text-white animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 flex-1">
              <Check className="w-4 h-4" />
              <span className="text-caption font-medium">{selectedIds.size} client{selectedIds.size > 1 ? 's' : ''} selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-caption font-medium">
                <Share className="w-3.5 h-3.5" />
                Share
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-caption font-medium">
                <Tag className="w-3.5 h-3.5" />
                Bulk Tag
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-caption font-medium">
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <button onClick={clearSelection} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Data Table ── */}
        <div className="bg-white rounded-xl border border-black/5 overflow-hidden min-w-0">
          <div className="overflow-x-auto">
            <table style={{ minWidth: 1280 }}>
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <th className="text-left py-3.5 pl-6 pr-4" style={{ width: 220 }}>
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-black/70 transition-colors group">
                      <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Clients</span>
                      <ArrowUpDown className="w-3 h-3 text-black/20 group-hover:text-black/50 transition-colors" />
                    </button>
                  </th>
                  <th className="text-left py-3.5 px-4" style={{ width: 90 }}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Team</span>
                  </th>
                  <th className="text-left py-3.5 px-4" style={{ width: 130 }}>
                    <button onClick={() => handleSort('clientType')} className="flex items-center gap-1.5 hover:text-black/70 transition-colors group">
                      <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Type</span>
                      <ArrowUpDown className="w-3 h-3 text-black/20 group-hover:text-black/50 transition-colors" />
                    </button>
                  </th>
                  <th className="text-center py-3.5 px-4" style={{ width: 120 }}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Onboarding</span>
                  </th>
                  <th className="text-center py-3.5 px-4" style={{ width: 120 }}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Kickoff</span>
                  </th>
                  <th className="text-left py-3.5 px-4" style={{ width: 110 }}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Last QC</span>
                  </th>
                  <th className="text-left py-3.5 px-4" style={{ width: 110 }}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Next QC</span>
                  </th>
                  <th className="text-center py-3.5 px-4" style={{ width: 90 }}>
                    <button onClick={() => handleSort('ksmTarget')} className="flex items-center gap-1.5 justify-center hover:text-black/70 transition-colors group mx-auto">
                      <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">KSM</span>
                      <ArrowUpDown className="w-3 h-3 text-black/20 group-hover:text-black/50 transition-colors" />
                    </button>
                  </th>
                  <th className="text-center py-3.5 px-4" style={{ width: 120 }}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Weekly Plan</span>
                  </th>
                  <th className="text-left py-3.5 px-4" style={{ width: 180 }}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Comments</span>
                  </th>
                  <th className="w-12 py-3.5 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, idx) => {
                  const isSelected = selectedIds.has(client.id);
                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-black/[0.04] hover:bg-[#F6F7FF]/50 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-[#EEF1FB]/40' : idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'
                      }`}
                    >
                      <td className="py-3.5 pl-6 pr-4">
                        <span className="text-black/85 text-body font-medium whitespace-nowrap">{client.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {client.kickoffStatus === 'Pending' ? (
                          <span className="text-black/20 text-body">—</span>
                        ) : (
                          <div className="flex items-center -space-x-1.5">
                            {client.team.map((member, mIdx) => (
                              <div
                                key={mIdx}
                                className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white text-[9px] font-bold text-white"
                                style={{ backgroundColor: member.color }}
                                title={member.initials}
                              >
                                {member.initials}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-caption font-medium whitespace-nowrap ${
                            client.clientType === 'Ecommerce' ? 'bg-[#EEF1FB] text-[#3D5EC7]' : 'bg-violet-50 text-violet-600'
                          }`}
                        >
                          {client.clientType}
                        </span>
                      </td>
                      {/* ONBOARDING STATUS */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {client.onboardingStatus === 'Pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/[0.03] border border-black/[0.06] text-black/35 text-caption font-medium whitespace-nowrap">
                            Pending
                          </span>
                        ) : client.onboardingStatus === 'In Progress' ? (
                          <button
                            onClick={() => setBusinessInfoClient(client)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700 text-caption font-medium hover:bg-amber-100/80 hover:border-amber-300 transition-all group/onb whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            In Progress
                          </button>
                        ) : (
                          <button
                            onClick={() => setBusinessInfoClient(client)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-caption font-medium hover:bg-emerald-100/80 hover:border-emerald-300 transition-all whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Complete
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {client.kickoffStatus === 'Pending' ? (
                          <button
                            onClick={() => { setKickoffMode('initial'); setKickoffClient(client); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700 text-caption font-medium hover:bg-amber-100/80 hover:border-amber-300 transition-all group/kick whitespace-nowrap"
                          >
                            Pending
                            <ChevronRight className="w-3 h-3 text-amber-400 group-hover/kick:text-amber-600 group-hover/kick:translate-x-0.5 transition-all" aria-hidden="true" />
                          </button>
                        ) : client.kickoffStatus === 'Onboarding' ? (
                          <button
                            onClick={() => { setKickoffMode('review'); setKickoffClient(client); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-700 text-caption font-medium hover:bg-blue-100/80 hover:border-blue-300 transition-all cursor-pointer group/onb whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Onboarding
                            <Eye className="w-3 h-3 text-blue-400 group-hover/onb:text-blue-600 transition-colors" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-caption font-medium whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Done
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {client.kickoffStatus === 'Pending' ? (
                          <span className="text-black/20 text-body">—</span>
                        ) : editingQC === client.id ? (
                          <input
                            type="date"
                            autoFocus
                            value={clientQCDates[client.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) setClientQCDates(prev => ({ ...prev, [client.id]: val }));
                            }}
                            onBlur={() => setEditingQC(null)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingQC(null); }}
                            className="px-2 py-0.5 border border-[#204CC7]/30 rounded-lg outline-none text-caption font-medium text-black/70 bg-white focus:ring-1 focus:ring-[#204CC7]/20 w-[130px]"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingQC(client.id)}
                            className="text-black/60 text-caption font-medium hover:text-[#204CC7] hover:bg-[#EEF1FB]/50 px-1.5 py-0.5 -mx-1.5 rounded transition-colors cursor-pointer whitespace-nowrap"
                            title="Click to edit"
                          >
                            {formatQCDate(clientQCDates[client.id] || client.lastQC)}
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {client.kickoffStatus === 'Pending' ? (
                          <span className="text-black/20 text-body">—</span>
                        ) : (
                          <span className="text-black/60 text-caption font-medium whitespace-nowrap">
                            {formatQCDate(addDays(clientQCDates[client.id] || client.lastQC, 15))}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {client.ksmTarget === 'Hit' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-caption font-semibold whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-caption font-semibold whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Miss
                          </span>
                        )}
                      </td>

                      {/* GROWTH PLAN STATUS */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {client.kickoffStatus === 'Pending' ? (
                          <span className="text-black/20 text-body">—</span>
                        ) : client.growthPlanStatus === 'Not Started' ? (
                          <button
                            onClick={() => setGrowthPlanClient(client)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/[0.03] border border-black/[0.06] text-black/40 text-caption font-medium hover:bg-black/[0.06] hover:text-black/60 hover:border-black/10 transition-all group/gp whitespace-nowrap"
                          >
                            Not Started
                            <Plus className="w-3 h-3 text-black/25 group-hover/gp:text-black/50 transition-colors" aria-hidden="true" />
                          </button>
                        ) : client.growthPlanStatus === 'In Progress' ? (
                          <button
                            onClick={() => setGrowthPlanClient(client)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700 text-caption font-medium hover:bg-amber-100/80 hover:border-amber-300 transition-all whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            In Progress
                          </button>
                        ) : (
                          <button
                            onClick={() => setGrowthPlanClient(client)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-caption font-medium hover:bg-emerald-100/80 hover:border-emerald-300 transition-all whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Sent
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder="Add a note..."
                          value={clientComments[client.id] || ''}
                          onChange={(e) => setClientComments(prev => ({ ...prev, [client.id]: e.target.value }))}
                          className="w-full bg-transparent border-none outline-none text-black/65 placeholder:text-black/25 hover:placeholder:text-black/35 focus:placeholder:text-black/30 transition-colors text-caption font-normal"
                        />
                      </td>
                      <td className="py-3.5 pr-4 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClientClick(client); }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/5 rounded-lg transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-black/55" />
                        </button>
                        {showClientMenu === client.id && (
                          <div ref={menuRef} className="absolute right-10 top-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 min-w-[200px]">
                            <button onClick={() => { setBusinessInfoClient(client); setShowClientMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F6F7FF] transition-colors text-left">
                              <Building2 className="w-4 h-4 text-[#5B7FD6]" />
                              <span className="text-black/75 text-caption font-medium">Business Info</span>
                            </button>
                            <button onClick={() => handleViewSelect('mediaPlan')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F6F7FF] transition-colors text-left">
                              <FileText className="w-4 h-4 text-[#5B7FD6]" />
                              <span className="text-black/75 text-caption font-medium">Planning</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-16 text-center">
                      <Search className="w-10 h-10 text-black/10 mx-auto mb-3" />
                      <p className="text-black/55 text-body font-medium">No clients match your filters</p>
                      <button onClick={resetFilters} className="mt-2 text-[#204CC7] hover:underline text-caption font-medium">Reset filters</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
            <span className="text-black/55 text-caption font-normal">
              Showing {filteredClients.length} of {totalClients} clients
            </span>
            <div className="flex items-center gap-2">
              <button disabled className="px-3 py-1.5 rounded-lg border border-black/8 text-black/60 hover:bg-black/[0.03] transition-all disabled:opacity-30 text-caption font-medium">
                Previous
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-[#EEF1FB] text-[#204CC7] text-caption font-semibold">1</span>
              <button className="px-3 py-1.5 rounded-lg border border-black/8 text-black/60 hover:bg-black/[0.03] transition-all text-caption font-medium">
                Next
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* ── Business Info Modal ── */}
        {businessInfoClient && (
          <BusinessInfoModal
            client={businessInfoClient}
            onClose={() => setBusinessInfoClient(null)}
          />
        )}

        {/* ── Growth Plan Modal ── */}
        {growthPlanClient && (
          <GrowthPlanModal
            client={growthPlanClient}
            onClose={() => setGrowthPlanClient(null)}
            onStatusChange={handleGrowthPlanStatusChange}
          />
        )}

        {/* ── Kickoff Modal ── */}
        {kickoffClient && (
          <KickoffModal
            client={kickoffClient}
            mode={kickoffMode}
            onClose={() => setKickoffClient(null)}
            onLaunch={(assignments, metrics) => {
              // Pending → Onboarding: store kickoff data and assign team avatars
              setClients(prev => prev.map(c => {
                if (c.id !== kickoffClient.id) return c;
                const assignedTeam = Object.entries(assignments)
                  .filter(([, v]) => v)
                  .map(([, empId]) => {
                    const emp = pmEmployeePool.find(e => e.id === empId);
                    const initials = emp ? emp.name.split(' ').map(n => n[0]).join('') : '';
                    return { initials, color: '#7c3aed' };
                  });
                return {
                  ...c,
                  kickoffStatus: 'Onboarding' as KickoffStatus,
                  team: assignedTeam,
                  kickoffData: { assignments, proposedMetrics: metrics },
                };
              }));
              setKickoffClient(null);
            }}
            onApprove={(finalMetrics) => {
              // HOD approves → Done + set planStartDate for Growth Plan
              const today = new Date().toISOString().split('T')[0];
              setClients(prev => prev.map(c => {
                if (c.id !== kickoffClient.id) return c;
                return {
                  ...c,
                  kickoffStatus: 'Done' as KickoffStatus,
                  lastQC: today,
                  planStartDate: c.planStartDate || today, // Set plan start only if not already set
                  kickoffData: c.kickoffData ? { ...c.kickoffData, proposedMetrics: finalMetrics } : undefined,
                };
              }));
              setClientQCDates(prev => ({ ...prev, [kickoffClient.id]: today }));
              setKickoffClient(null);
            }}
          />
        )}
      </div>
    );
  }

  // ─── CLIENT DETAIL VIEW ──────────────────────────────────────
  if ((currentView === 'creativeWorkflow' || currentView === 'mediaPlan') && selectedClient) {
    return (
      <ClientDetailView
        client={selectedClient}
        onBack={handleBackToList}
        monthIdx={selectedMonthIdx}
        year={selectedYear}
        onMonthChange={setSelectedMonthIdx}
        onYearChange={setSelectedYear}
      />
    );
  }

  // ─── REPORTS VIEW ──────────────────────────────────────────────
  if (currentView === 'reports' && selectedClient) {
    return (
      <div className="-mx-8 -mt-6">
        <div className="bg-white border-b border-black/5 px-6 py-4 sticky -top-6 z-30">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToList} className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-black/60" />
            </button>
            <div>
              <h1 className="text-black/90 text-h2 font-bold">{selectedClient.name}</h1>
              <p className="text-black/55 text-caption font-normal">Reports</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-20 text-center mx-6 mt-4 mb-6">
          <BarChart3 className="w-16 h-16 text-black/10 mx-auto mb-4" />
          <h3 className="text-black/80 mb-2 text-h3 font-semibold">Reports</h3>
          <p className="text-black/55 text-caption font-normal">Client reports interface coming soon</p>
        </div>
      </div>
    );
  }

  return null;
}
