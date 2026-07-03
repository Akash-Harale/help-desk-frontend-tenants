import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket, Key, RefreshCw, Copy, Check, Eye, EyeOff, Shield,
  AlertTriangle, BarChart2, Filter, Search, Download,
  MessageSquare, Send, User, Clock, CheckCircle2, XCircle,
  Activity, Inbox, AlertCircle, PieChart, TrendingUp, Settings, X,
  ArrowLeft, Calendar, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTenant } from '../context/TenantContext';
import { useUser } from '../context/UserContext';
import { getTickets, getAgingReport, updateTicketStatus } from '../services/ticketService';
import api from '../services/api';

export default function AdminDashboardPage() {
  const { tenant_id, organization_name, theme, app_key } = useTenant();
  const { user, updateUser } = useUser();

  // Navigation tabs (top-level section)
  const [activeTab, setActiveTab] = useState('overview'); // overview | queue | aging | config

  // Date Filter State (by default 'today')
  const [dateOption, setDateOption] = useState('today'); // today | yesterday | last_7_days | last_15_days | last_1_month | custom
  const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Drill-Down State for Overview Navigation Flow
  // level: 1 (Main Cards) | 2 (Priority & Status Breakdown) | 4 (Dates list) | 5 (Actual Tickets Read-Only Table)
  const [drillLevel, setDrillLevel] = useState(1);
  const [drillCategory, setDrillCategory] = useState(null); // e.g., 'Total Tickets', 'Open Tickets', 'Resolved / Closed'
  const [drillStatusFilter, setDrillStatusFilter] = useState(''); // filter for level 2 subset (status)
  const [drillPriorityFilter, setDrillPriorityFilter] = useState(''); // filter for level 2 subset (priority)
  const [subFilterType, setSubFilterType] = useState(null); // 'priority' or 'status'
  const [subFilterValue, setSubFilterValue] = useState(null); // e.g., 'high' or 'open'
  const [selectedDrillDate, setSelectedDrillDate] = useState(null);

  // Raw ticket data
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketError, setTicketError] = useState('');

  // Selected ticket for modal view
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerStatus, setDrawerStatus] = useState('');
  const [drawerComment, setDrawerComment] = useState('');
  const [resolverName, setResolverName] = useState(user?.name || organization_name || 'Admin');
  const [resolverEmail, setResolverEmail] = useState(user?.email || '');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateErr, setUpdateErr] = useState('');

  // Queue tab filter state (for standalone Ticket Queue tab)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('oldest_open');

  // Aging report state
  const [agingDate, setAgingDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Configuration state
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [form, setForm] = useState({
    notification_email: user?.notification_email || theme?.support_email || '',
    webhook_url: user?.webhook_url || ''
  });

  useEffect(() => {
    setForm({
      notification_email: user?.notification_email || theme?.support_email || '',
      webhook_url: user?.webhook_url || ''
    });
  }, [user, theme]);

  const [agingTickets, setAgingTickets] = useState([]);
  const [loadingAging, setLoadingAging] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [tenant_id]);

  useEffect(() => {
    fetchAgingTickets(agingDate);
  }, [agingDate, tenant_id]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    setTicketError('');
    try {
      const data = await getTickets({ is_admin: true });
      if (data.success) {
        setTickets(data.data || []);
      } else {
        setTicketError(data.message || 'Failed to fetch tickets.');
      }
    } catch (err) {
      setTicketError(err.response?.data?.message || 'Cannot reach backend server.');
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchAgingTickets = async (dateStr) => {
    setLoadingAging(true);
    try {
      const data = await getAgingReport(dateStr, true);
      if (data.success) {
        setAgingTickets(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching aging tickets:', err);
    } finally {
      setLoadingAging(false);
    }
  };

  // Helper: Filter tickets by the chosen date range
  const filterByDateRange = (list, option, fromStr, toStr) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return list.filter(t => {
      const tTime = new Date(t.createdAt).getTime();
      if (option === 'today') {
        return tTime >= todayStart;
      }
      if (option === 'yesterday') {
        const yestStart = todayStart - 86400000;
        return tTime >= yestStart && tTime < todayStart;
      }
      if (option === 'last_7_days') {
        return tTime >= todayStart - 6 * 86400000;
      }
      if (option === 'last_15_days') {
        return tTime >= todayStart - 14 * 86400000;
      }
      if (option === 'last_1_month') {
        return tTime >= todayStart - 29 * 86400000;
      }
      if (option === 'custom') {
        if (!fromStr || !toStr) return true;
        const start = new Date(fromStr);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toStr);
        end.setHours(23, 59, 59, 999);
        return tTime >= start.getTime() && tTime <= end.getTime();
      }
      return true;
    });
  };

  // Date-filtered tickets pool for Level 1 & Level 2 calculations
  const dateFilteredTickets = useMemo(() => {
    return filterByDateRange(tickets, dateOption, customFrom, customTo);
  }, [tickets, dateOption, customFrom, customTo]);

  // KPI Calculations on the dateFilteredTickets
  const kpis = useMemo(() => {
    const now = new Date();
    const openCount = dateFilteredTickets.filter(t => t.status === 'open').length;
    const ackCount = dateFilteredTickets.filter(t => t.status === 'acknowledged').length;
    const progCount = dateFilteredTickets.filter(t => t.status === 'in_progress').length;
    const resCount = dateFilteredTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;

    const autoClosedCount = dateFilteredTickets.filter(t =>
      t.status === 'closed' && (
        t.resolvedBy?.name === 'System Auto-Close' ||
        t.comments?.some(c => c.by?.role === 'system' || c.by?.name === 'System Auto-Close')
      )
    ).length;

    const openTickets = dateFilteredTickets.filter(t => !['resolved', 'closed'].includes(t.status));
    openTickets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const oldestOpen = openTickets[0] || null;
    let oldestAgeText = 'None';
    if (oldestOpen) {
      const diffHrs = Math.floor((now.getTime() - new Date(oldestOpen.createdAt).getTime()) / 3600000);
      if (diffHrs < 24) oldestAgeText = `${diffHrs} hours`;
      else {
        oldestAgeText = `${Math.floor(diffHrs / 24)} days`;
      }
    }

    // Average Response Time: first response from creation time across tickets in range
    let totalRespHours = 0;
    let respCount = 0;
    dateFilteredTickets.forEach(t => {
      let firstRespDate = null;
      if (t.comments && t.comments.length > 0) {
        firstRespDate = new Date(t.comments[0].date || t.statusUpdatedAt || t.updatedAt);
      } else if (t.statusUpdatedAt && t.status !== 'open') {
        firstRespDate = new Date(t.statusUpdatedAt);
      }
      if (firstRespDate) {
        const diff = (firstRespDate.getTime() - new Date(t.createdAt).getTime()) / 3600000;
        if (diff >= 0) {
          totalRespHours += diff;
          respCount++;
        }
      }
    });
    const avgRespHours = respCount > 0 ? Math.round((totalRespHours / respCount) * 10) / 10 : 0;
    const avgRespText = avgRespHours < 24 ? `${avgRespHours}h` : `${Math.round(avgRespHours / 24 * 10) / 10} days`;

    return {
      total: dateFilteredTickets.length,
      open: openCount,
      acknowledged: ackCount,
      inProgress: progCount,
      resolved: resCount,
      autoClosed: autoClosedCount,
      oldestOpen,
      oldestAgeText,
      avgRespText,
      respCount
    };
  }, [dateFilteredTickets]);

  // Subset of tickets for Level 2 (Summary Breakdown) based on clicked KPI card
  const level2Tickets = useMemo(() => {
    let list = dateFilteredTickets;
    if (drillStatusFilter) {
      if (drillStatusFilter === 'resolved_or_closed') {
        list = list.filter(t => ['resolved', 'closed'].includes(t.status));
      } else if (drillStatusFilter === 'auto_closed') {
        list = list.filter(t =>
          t.status === 'closed' && (
            t.resolvedBy?.name === 'System Auto-Close' ||
            t.comments?.some(c => c.by?.role === 'system' || c.by?.name === 'System Auto-Close')
          )
        );
      } else {
        list = list.filter(t => t.status === drillStatusFilter);
      }
    }
    if (drillPriorityFilter) {
      list = list.filter(t => (t.priority || 'low') === drillPriorityFilter);
    }
    return list;
  }, [dateFilteredTickets, drillStatusFilter, drillPriorityFilter]);

  // Priority and Status counts for Level 2
  const level2Counts = useMemo(() => {
    return {
      priority: {
        high: level2Tickets.filter(t => (t.priority || 'low') === 'high').length,
        medium: level2Tickets.filter(t => (t.priority || 'low') === 'medium').length,
        low: level2Tickets.filter(t => (t.priority || 'low') === 'low').length,
      },
      status: {
        open: level2Tickets.filter(t => t.status === 'open').length,
        acknowledged: level2Tickets.filter(t => t.status === 'acknowledged').length,
        in_progress: level2Tickets.filter(t => t.status === 'in_progress').length,
        resolved: level2Tickets.filter(t => t.status === 'resolved').length,
        closed: level2Tickets.filter(t => t.status === 'closed').length,
      }
    };
  }, [level2Tickets]);

  // Priority and Status counts for Overview breakdown (Level 1)
  const overviewBreakdowns = useMemo(() => {
    return {
      priority: {
        high: dateFilteredTickets.filter(t => (t.priority || 'low') === 'high').length,
        medium: dateFilteredTickets.filter(t => (t.priority || 'low') === 'medium').length,
        low: dateFilteredTickets.filter(t => (t.priority || 'low') === 'low').length,
      },
      status: {
        open: dateFilteredTickets.filter(t => t.status === 'open').length,
        acknowledged: dateFilteredTickets.filter(t => t.status === 'acknowledged').length,
        in_progress: dateFilteredTickets.filter(t => t.status === 'in_progress').length,
        resolved: dateFilteredTickets.filter(t => t.status === 'resolved').length,
        closed: dateFilteredTickets.filter(t => t.status === 'closed').length,
      }
    };
  }, [dateFilteredTickets]);

  // Active ticket pool for Date List (Level 4) and Date Ticket table (Level 5)
  const drillActivePool = useMemo(() => {
    const base = (drillStatusFilter || drillPriorityFilter) ? level2Tickets : dateFilteredTickets;
    if (!subFilterType) return base;
    if (subFilterType === 'priority') {
      return base.filter(t => (t.priority || 'low') === subFilterValue);
    }
    if (subFilterType === 'status') {
      return base.filter(t => t.status === subFilterValue);
    }
    return base;
  }, [level2Tickets, dateFilteredTickets, drillStatusFilter, drillPriorityFilter, subFilterType, subFilterValue]);

  // Handlers for Drill-Down navigation
  const handleCardClick = (categoryName, statusKey, priorityKey = '') => {
    setDrillCategory(categoryName);
    setDrillStatusFilter(statusKey || '');
    setDrillPriorityFilter(priorityKey || '');
    setSubFilterType(null);
    setSubFilterValue(null);
    setDrillLevel(2);
  };

  const handleResetToLevel1 = () => {
    setDrillLevel(1);
    setDrillCategory(null);
    setDrillStatusFilter('');
    setDrillPriorityFilter('');
    setSubFilterType(null);
    setSubFilterValue(null);
    setSelectedDrillDate(null);
  };

  const handleLevel2Click = (type, value) => {
    setSubFilterType(type);
    setSubFilterValue(value);
    setDrillLevel(4);
  };

  // Export actual tickets (Level 5 or Queue)
  const downloadActualTickets = () => {
    const rows = drillActivePool.map(t => ({
      'Ticket Number': `#${t.ticketNumber}`,
      'Subject': t.subject,
      'Type': t.ticketType?.toUpperCase(),
      'Priority': (t.priority || 'low').toUpperCase(),
      'Status': t.status?.toUpperCase(),
      'Submitted By': t.createdBy?.name || 'Unknown',
      'Submitter Email': t.createdBy?.email || 'Unknown',
      'Created Date': new Date(t.createdAt).toLocaleString(),
      'First Response / Update': t.statusUpdatedAt ? new Date(t.statusUpdatedAt).toLocaleString() : 'N/A',
      'Resolver': t.resolvedBy?.name || 'Unassigned'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Actual Tickets');
    XLSX.writeFile(wb, `HelpDesk_${drillCategory?.replace(/\s+/g, '_') || 'Tickets'}_${dateOption}.xlsx`);
  };

  // Standalone Queue Filtering
  const filteredQueue = useMemo(() => {
    let list = [...tickets];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(t =>
        t.subject?.toLowerCase().includes(s) ||
        t.description?.toLowerCase().includes(s) ||
        String(t.ticketNumber).includes(s) ||
        t.createdBy?.name?.toLowerCase().includes(s) ||
        t.createdBy?.email?.toLowerCase().includes(s)
      );
    }
    if (statusFilter) list = list.filter(t => t.status === statusFilter);
    if (priorityFilter) list = list.filter(t => t.priority === priorityFilter);
    if (typeFilter) list = list.filter(t => t.ticketType === typeFilter);
    if (startDate) list = list.filter(t => new Date(t.createdAt) >= new Date(startDate));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(t => new Date(t.createdAt) <= end);
    }
    if (sortOrder === 'oldest_open') {
      list.sort((a, b) => {
        const aOpen = !['resolved', 'closed'].includes(a.status);
        const bOpen = !['resolved', 'closed'].includes(b.status);
        if (aOpen && !bOpen) return -1;
        if (!aOpen && bOpen) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [tickets, search, statusFilter, priorityFilter, typeFilter, startDate, endDate, sortOrder]);

  // Aging report calculation
  const agingData = useMemo(() => {
    const ref = new Date(agingDate && agingDate.includes('T') ? agingDate : `${agingDate || new Date().toISOString().split('T')[0]}T23:59:59.999Z`);
    const pool = activeTab === 'aging' ? agingTickets : (agingTickets.length > 0 ? agingTickets : tickets);
    const unresolved = pool.filter(t => {
      const createdTime = new Date(t.createdAt).getTime();
      const status = (t.status || '').toLowerCase();
      return createdTime <= ref.getTime() && !['resolved', 'closed'].includes(status);
    });
    const buckets = { '< 24 Hours': [], '1 - 3 Days': [], '4 - 7 Days': [], '8 - 14 Days': [], '15+ Days': [] };
    const enrichedList = unresolved.map(t => {
      const diffHrs = Math.max(0, Math.floor((ref.getTime() - new Date(t.createdAt).getTime()) / 3600000));
      const ageDays = Math.floor(diffHrs / 24);
      let bucketName = '< 24 Hours';
      if (diffHrs >= 24 && ageDays <= 3) bucketName = '1 - 3 Days';
      else if (ageDays >= 4 && ageDays <= 7) bucketName = '4 - 7 Days';
      else if (ageDays >= 8 && ageDays <= 14) bucketName = '8 - 14 Days';
      else if (ageDays >= 15) bucketName = '15+ Days';
      buckets[bucketName].push(t);
      return { ...t, ageDays, bucketName };
    });
    enrichedList.sort((a, b) => b.ageDays - a.ageDays);
    return { unresolved: enrichedList, buckets };
  }, [agingTickets, tickets, agingDate, activeTab]);

  const downloadAgingReport = () => {
    const rows = agingData.unresolved.map(t => ({
      'Ticket Number': `#${t.ticketNumber}`,
      'Subject': t.subject,
      'Type': t.ticketType?.toUpperCase(),
      'Priority': (t.priority || 'low').toUpperCase(),
      'Status': t.status?.toUpperCase(),
      'Submitter Name': t.createdBy?.name || 'Unknown',
      'Submitter Email': t.createdBy?.email || 'Unknown',
      'Created Date': new Date(t.createdAt).toLocaleString(),
      'Age (Days)': t.ageDays,
      'Aging Bucket': t.bucketName,
      'Last Assigned Resolver': t.resolvedBy?.name || 'Unassigned'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aging Report');
    XLSX.writeFile(wb, `HelpDesk_Aging_Report_${agingDate}.xlsx`);
  };

  const handleOpenDrawer = (ticket, isReadOnly = false) => {
    setSelectedTicket({ ...ticket, _isReadOnly: isReadOnly });
    setDrawerStatus(ticket.status);
    setDrawerComment('');
    setUpdateMsg('');
    setUpdateErr('');
    if (ticket.resolvedBy?.name) setResolverName(ticket.resolvedBy.name);
    if (ticket.resolvedBy?.email) setResolverEmail(ticket.resolvedBy.email);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedTicket || selectedTicket._isReadOnly) return;
    setUpdatingStatus(true);
    setUpdateMsg('');
    setUpdateErr('');
    try {
      const data = await updateTicketStatus(
        selectedTicket._id,
        drawerStatus,
        drawerComment,
        {
          user_id: user?.user_id || tenant_id,
          name: resolverName || user?.name || 'Support Admin',
          email: resolverEmail || user?.email || '',
          role: user?.role || 'admin'
        }
      );
      if (data.success) {
        setUpdateMsg('Status and comments updated successfully!');
        setSelectedTicket({ ...data.data, _isReadOnly: selectedTicket._isReadOnly });
        fetchTickets();
      } else {
        setUpdateErr(data.message || 'Failed to update ticket status.');
      }
    } catch (err) {
      setUpdateErr(err.response?.data?.message || 'Error reaching server.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(app_key || 'hd_live_key');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerate = async () => {
    if (!confirmRegen) { setConfirmRegen(true); return; }
    setRegenerating(true); setConfigError(''); setConfigSuccess(''); setConfirmRegen(false);
    try {
      const res = await api.post('/auth/regenerate-key');
      if (res.data?.success) {
        setConfigSuccess('New App Key generated! Copy it now and update your client integrations.');
        if (updateUser) updateUser({ app_key: res.data.app_key });
      } else {
        setConfigError(res.data?.message || 'Failed to regenerate key.');
      }
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Must be logged in with tenant JWT to regenerate key.');
    } finally { setRegenerating(false); }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault(); setSavingConfig(true); setConfigError(''); setConfigSuccess('');
    try {
      const res = await api.put('/tenants/config', form);
      if (res.data?.success) {
        setConfigSuccess('Configuration updated successfully.');
        if (updateUser) updateUser(form);
        setEditMode(false);
      } else { setConfigError(res.data?.message || 'Failed to update configuration.'); }
    } catch (err) { setConfigError(err.response?.data?.message || 'Error updating configuration.'); }
    finally { setSavingConfig(false); }
  };

  const maskedKey = '••••••••••••••••••••••••••••••••••••••••••••••••••••••';

  // Render Date Dropdown Widget (available on top right of Level 1, 2, and Level 3 Actual Tickets page)
  const renderDateSelector = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <Calendar size={15} color="#8b5cf6" />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>DATE RANGE:</span>
      <select
        style={{ background: '#1e1e2e', border: '1px solid var(--border)', color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', outline: 'none', padding: '2px 8px', borderRadius: '6px' }}
        value={dateOption}
        onChange={e => setDateOption(e.target.value)}
      >
        <option value="today" style={{ background: '#1e1e2e', color: '#ffffff' }}>Today</option>
        <option value="yesterday" style={{ background: '#1e1e2e', color: '#ffffff' }}>Yesterday</option>
        <option value="last_7_days" style={{ background: '#1e1e2e', color: '#ffffff' }}>Last 7 Days</option>
        <option value="last_15_days" style={{ background: '#1e1e2e', color: '#ffffff' }}>Last 15 Days</option>
        <option value="last_1_month" style={{ background: '#1e1e2e', color: '#ffffff' }}>Last 1 Month</option>
        <option value="custom" style={{ background: '#1e1e2e', color: '#ffffff' }}>Custom Dates</option>
      </select>
      {dateOption === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6, borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
          <input type="date" style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
            value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
          <input type="date" style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
            value={customTo} onChange={e => setCustomTo(e.target.value)} />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        .breakdown-item {
          transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .breakdown-item:hover {
          background: rgba(255,255,255,0.06) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .date-list-row {
          transition: background 0.2s ease, transform 0.2s ease !important;
        }
        .date-list-row:hover {
          background: rgba(255,255,255,0.08) !important;
          transform: translateX(4px);
        }
      `}</style>
      {/* Title & Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Subscriber Support Operations
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
            Manage {organization_name || 'Help Desk'} tickets, monitor SLAs, and explore interactive drill-down analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={fetchTickets} className="btn btn-ghost" title="Refresh data">
            <RefreshCw size={15} className={loadingTickets ? 'spin' : ''} />
          </button>
          <div className="nav-tabs" style={{ marginBottom: 0 }}>
            <button onClick={() => { setActiveTab('overview'); setDrillLevel(1); }} className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}>
              <Activity size={16} /> Overview & Drill-Downs
            </button>
            {/* <button onClick={() => setActiveTab('queue')} className={`nav-tab ${activeTab === 'queue' ? 'active' : ''}`}>
              <Inbox size={16} /> Ticket Queue ({tickets.length})
            </button> */}
            <button onClick={() => setActiveTab('aging')} className={`nav-tab ${activeTab === 'aging' ? 'active' : ''}`}>
              <Clock size={16} /> Aging Report
            </button>
            {/* <button onClick={() => setActiveTab('config')} className={`nav-tab ${activeTab === 'config' ? 'active' : ''}`}>
              <Settings size={16} /> API & Config
            </button> */}
          </div>
        </div>
      </div>

      {ticketError && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '12px', color: '#f87171', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} /> {ticketError}
        </div>
      )}

      {/* ── TAB 1: OVERVIEW WITH DRILL-DOWN FLOW ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Top Bar inside Overview: Drill-down breadcrumbs on Left, Date Selector on Right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleResetToLevel1} style={{ background: 'transparent', border: 'none', color: drillLevel === 1 ? '#8b5cf6' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                📊 Summary Overview
              </button>
              {drillLevel >= 2 && drillCategory && (
                <>
                  <ChevronRight size={14} color="var(--text-muted)" />
                  <button onClick={() => setDrillLevel(2)} style={{ background: 'transparent', border: 'none', color: drillLevel === 2 ? '#8b5cf6' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>
                    {drillCategory} ({level2Tickets.length})
                  </button>
                </>
              )}
              {drillLevel === 4 && (
                <>
                  <ChevronRight size={14} color="var(--text-muted)" />
                  <span style={{ color: '#8b5cf6', fontWeight: 700 }}>
                    Dates Breakdown: {subFilterType ? `${subFilterType.toUpperCase()}: ${subFilterValue.toUpperCase()}` : ''}
                  </span>
                </>
              )}
              {drillLevel === 5 && (
                <>
                  <ChevronRight size={14} color="var(--text-muted)" />
                  <button onClick={() => setDrillLevel(4)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>
                    Dates Breakdown: {subFilterType ? `${subFilterType.toUpperCase()}: ${subFilterValue.toUpperCase()}` : ''}
                  </button>
                  <ChevronRight size={14} color="var(--text-muted)" />
                  <span style={{ color: '#8b5cf6', fontWeight: 700 }}>
                    Tickets on {selectedDrillDate}
                  </span>
                </>
              )}
            </div>

            {/* Date selector always present on top right */}
            {renderDateSelector()}
          </div>

          {/* ── LEVEL 1: MAIN KPI & TOTAL CARDS ── */}
          {drillLevel === 1 && (
            <div>
              {/* Total Tickets Hero Banner Card */}
              <div
                onClick={() => handleCardClick('Total Tickets', '')}
                style={{
                  background: 'var(--brand-gradient)',
                  borderRadius: '18px',
                  padding: '1.75rem 2rem',
                  color: '#fff',
                  marginBottom: '1.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
                    Total Tickets Submitted ({dateOption.replace(/_/g, ' ')})
                  </div>
                  <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.1, margin: '0.3rem 0' }}>
                    {kpis.total}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    👉 Click to drill down into priority and status breakdown for these tickets
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.18)', padding: '16px', borderRadius: '16px' }}>
                  <Ticket size={40} color="#fff" />
                </div>
              </div>

              {/* ── TICKETS BY STATUS SECTION ── */}
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '1.5rem 0 1rem 0', color: '#9278f8ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏷️ Tickets by Status
              </h3>
              <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
                <div className="kpi-card" onClick={() => handleCardClick('Open Tickets', 'open')}>
                  <div className="kpi-header">
                    <span className="kpi-title">Open Tickets</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}><AlertCircle size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.status.open}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => handleCardClick('Acknowledged Tickets', 'acknowledged')}>
                  <div className="kpi-header">
                    <span className="kpi-title">Acknowledged</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc' }}><CheckCircle2 size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.status.acknowledged}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => handleCardClick('In Progress Tickets', 'in_progress')}>
                  <div className="kpi-header">
                    <span className="kpi-title">In Progress</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}><Clock size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.status.in_progress}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => handleCardClick('Resolved Tickets', 'resolved')}>
                  <div className="kpi-header">
                    <span className="kpi-title">Resolved</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}><CheckCircle2 size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.status.resolved}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => handleCardClick('Closed Tickets', 'closed')}>
                  <div className="kpi-header">
                    <span className="kpi-title">Closed</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}><XCircle size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.status.closed}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => handleCardClick('Auto-Closed Tickets', 'auto_closed')}>
                  <div className="kpi-header">
                    <span className="kpi-title">Auto-Closed</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}><XCircle size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{kpis.autoClosed}</div>
                    <div className="kpi-subtext">System rule closures</div>
                  </div>
                </div>
              </div>

              {/* ── TICKETS BY PRIORITY SECTION ── */}
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '2rem 0 1rem 0', color: '#9278f8ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Tickets by Priority
              </h3>
              <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
                <div className="kpi-card" onClick={() => handleCardClick('High Priority Tickets', '', 'high')}>
                  <div className="kpi-header">
                    <span className="kpi-title">High Priority</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}><Activity size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.priority.high}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => handleCardClick('Medium Priority Tickets', '', 'medium')}>
                  <div className="kpi-header">
                    <span className="kpi-title">Medium Priority</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}><Activity size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.priority.medium}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => handleCardClick('Low Priority Tickets', '', 'low')}>
                  <div className="kpi-header">
                    <span className="kpi-title">Low Priority</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}><Activity size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{overviewBreakdowns.priority.low}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                  </div>
                </div>
              </div>

              {/* ── PERFORMANCE METRICS SECTION ── */}
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '2rem 0 1rem 0', color: '#9278f8ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📈 Performance Metrics
              </h3>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">Avg. Response Time</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}><Activity size={20} /></div>
                  </div>
                  <div>
                    <div className="kpi-value">{kpis.avgRespText}</div>
                    <div className="kpi-subtext">Calculated from creation to 1st response</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LEVEL 2: SUMMARY BREAKDOWN BY PRIORITY & STATUS ── */}
          {drillLevel === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Drill-Down: {drillCategory} ({level2Tickets.length} tickets)
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Click below to view by dates.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => handleLevel2Click(null, null)}>
                  View All Actual Tickets ({level2Tickets.length}) →
                </button>
              </div>

              {/* Tickets by Priority - only show if drillPriorityFilter is NOT set */}
              {!drillPriorityFilter && (
                <>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: '#c4b5fd' }}>
                    ⚡ Tickets by Priority (Click to drill down)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                    <div onClick={() => handleLevel2Click('priority', 'high')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '4px solid #ef4444', borderRadius: '16px', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s ease' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>High Priority</div>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>{level2Counts.priority.high}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click to view high priority tickets →</div>
                    </div>

                    <div onClick={() => handleLevel2Click('priority', 'medium')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '4px solid #f59e0b', borderRadius: '16px', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s ease' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>Medium Priority</div>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>{level2Counts.priority.medium}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click to view medium priority tickets →</div>
                    </div>

                    <div onClick={() => handleLevel2Click('priority', 'low')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '4px solid #3b82f6', borderRadius: '16px', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s ease' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Low Priority</div>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.4rem 0' }}>{level2Counts.priority.low}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click to view low priority tickets →</div>
                    </div>
                  </div>
                </>
              )}

              {/* Tickets by Status - only show if drillStatusFilter is NOT set */}
              {!drillStatusFilter && (
                <>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: '#c4b5fd' }}>
                    🏷️ Tickets by Status (Click to drill down)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    {[
                      { key: 'open', label: 'Open', color: '#60a5fa', count: level2Counts.status.open },
                      { key: 'acknowledged', label: 'Acknowledged', color: '#c084fc', count: level2Counts.status.acknowledged },
                      { key: 'in_progress', label: 'In Progress', color: '#fbbf24', count: level2Counts.status.in_progress },
                      { key: 'resolved', label: 'Resolved', color: '#34d399', count: level2Counts.status.resolved },
                      { key: 'closed', label: 'Closed', color: '#94a3b8', count: level2Counts.status.closed },
                    ].map(item => (
                      <div key={item.key} onClick={() => handleLevel2Click('status', item.key)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `4px solid ${item.color}`, borderRadius: '14px', padding: '1.25rem', cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color, textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.3rem 0' }}>{item.count}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View actual tickets →</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}



          {/* ── LEVEL 4: TICKETS BY DATE LIST ── */}
          {drillLevel === 4 && (() => {
            const ticketsForCategory = drillActivePool;

            const dateGroups = {};
            ticketsForCategory.forEach(t => {
              const localDate = new Date(t.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              const dateKey = new Date(t.createdAt).toISOString().split('T')[0];
              if (!dateGroups[dateKey]) {
                dateGroups[dateKey] = {
                  key: dateKey,
                  label: localDate,
                  count: 0,
                  tickets: []
                };
              }
              dateGroups[dateKey].count++;
              dateGroups[dateKey].tickets.push(t);
            });

            const sortedDates = Object.values(dateGroups).sort((a, b) => b.key.localeCompare(a.key));

            const categoryLabel = subFilterType === 'priority' 
              ? `${subFilterValue.charAt(0).toUpperCase() + subFilterValue.slice(1)} Priority`
              : `${subFilterValue.charAt(0).toUpperCase() + subFilterValue.slice(1).replace('_', ' ')} Status`;

            return (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                  <button onClick={() => {
                    if (drillStatusFilter || drillPriorityFilter) {
                      setDrillLevel(2);
                    } else {
                      handleResetToLevel1();
                    }
                  }} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                    Tickets by Date: {categoryLabel} ({ticketsForCategory.length} tickets)
                  </h2>
                </div>
                
                {sortedDates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No tickets found for this selection.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sortedDates.map(group => (
                      <div
                        key={group.key}
                        onClick={() => {
                          setSelectedDrillDate(group.key);
                          setDrillLevel(5);
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem 1.5rem',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease, transform 0.2s ease'
                        }}
                        className="date-list-row"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Calendar size={16} color="var(--brand-primary)" />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{group.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>{group.count} {group.count === 1 ? 'ticket' : 'tickets'}</span>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── LEVEL 5: TICKETS FOR A SPECIFIC DRILL DATE ── */}
          {drillLevel === 5 && (() => {
            const ticketsForCategory = drillActivePool;

            const dateTickets = ticketsForCategory.filter(t => {
              return new Date(t.createdAt).toISOString().split('T')[0] === selectedDrillDate;
            });

            const formattedDate = selectedDrillDate ? new Date(`${selectedDrillDate}T00:00:00`).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : '';

            const categoryLabel = subFilterType === 'priority'
              ? `${subFilterValue.charAt(0).toUpperCase() + subFilterValue.slice(1)} Priority`
              : `${subFilterValue.charAt(0).toUpperCase() + subFilterValue.slice(1).replace('_', ' ')} Status`;

            return (
              <div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => setDrillLevel(4)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                          <ArrowLeft size={14} /> Back to Dates
                        </button>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                          Tickets on {formattedDate} ({dateTickets.length}) — READ ONLY
                        </h2>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
                        Drill-Down for: <strong>{categoryLabel}</strong>. All details are non-editable.
                      </p>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Ticket #</th>
                          <th>Subject</th>
                          <th>Type</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Requester</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateTickets.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No tickets found for this date.</td>
                          </tr>
                        ) : (
                          dateTickets.map(t => (
                            <tr key={t._id} onClick={() => handleOpenDrawer(t, true)}>
                              <td style={{ fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>#{t.ticketNumber}</td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{t.subject}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                                  {t.description}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.78rem', textTransform: 'capitalize', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                  {t.ticketType || 'issue'}
                                </span>
                              </td>
                              <td>
                                <span className={`priority-${t.priority || 'low'}`} style={{ textTransform: 'capitalize', fontWeight: 700 }}>
                                  {t.priority || 'low'}
                                </span>
                              </td>
                              <td>
                                <span className={`status-pill status-${t.status}`}>
                                  {t.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td>
                                <div>{t.createdBy?.name || 'Unknown'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.createdBy?.email}</div>
                              </td>
                              <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TAB 2: STANDALONE MASTER QUEUE ── */}
      {activeTab === 'queue' && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Full Master Queue ({filteredQueue.length})</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  The Task Queue serves as the primary master registry of all support requests submitted under this tenant. Use this interface to search, filter by priority or status, and open tickets to update their resolution lifecycle.
                </p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Ticket #</th><th>Submitted Date</th><th>Subject</th><th>Type</th><th>Status</th><th>Priority</th></tr>
                </thead>
                <tbody>
                  {filteredQueue.map(t => (
                    <tr key={t._id} onClick={() => handleOpenDrawer(t, false)}>
                      <td style={{ fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>#{t.ticketNumber}</td>
                      <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{t.subject}</td>
                      <td>{t.ticketType}</td>
                      <td><span className={`status-pill status-${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                      <td><span className={`priority-${t.priority || 'low'}`} style={{ textTransform: 'capitalize' }}>{t.priority || 'low'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: AGING REPORT ── */}
      {activeTab === 'aging' && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #f59e0b', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>⏳ Help Desk Aging Report</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Unresolved tickets up to reference date.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="date" style={{ padding: '0.4rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-base)', color: '#fbbf24', fontWeight: 700 }}
                  max={new Date().toISOString().split('T')[0]}
                  value={agingDate}
                  onChange={e => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const val = e.target.value;
                    if (val > todayStr) {
                      setAgingDate(todayStr);
                    } else {
                      setAgingDate(val);
                    }
                  }} />
                <button className="btn btn-primary" onClick={downloadAgingReport}>Download Aging Report (.xlsx)</button>
              </div>
            </div>

            {/* Buckets summary grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
              {Object.entries(agingData.buckets).map(([bucketName, list]) => {
                const isTodaySelected = agingDate === new Date().toISOString().split('T')[0];
                if (bucketName === '< 24 Hours' && !isTodaySelected) {
                  return null;
                }

                let color = '#60a5fa';
                if (bucketName === '1 - 3 Days') color = '#fbbf24';
                if (bucketName === '4 - 7 Days') color = '#f97316';
                if (bucketName === '8 - 14 Days' || bucketName === '15+ Days') color = '#ef4444';

                return (
                  <div key={bucketName} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, borderRadius: '12px', textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{bucketName}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color, margin: '0.3rem 0' }}>{list.length}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>unresolved ticket{list.length !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aging table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Unresolved Tickets as of {agingDate} ({agingData.unresolved.length})
            </h3>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Submitted Date</th>
                    <th>Subject</th>
                    <th>Age (Days)</th>
                    <th>Aging Bucket</th>
                    <th>Status</th>
                    <th>Priority</th>
                    {/* <th>Assigned Resolver</th> */}
                  </tr>
                </thead>
                <tbody>
                  {agingData.unresolved.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>🎉 No unresolved tickets aging up to {agingDate}!</td></tr>
                  ) : (
                    agingData.unresolved.map(t => {
                      let badgeColor = '#60a5fa';
                      if (t.ageDays >= 4 && t.ageDays <= 7) badgeColor = '#f97316';
                      if (t.ageDays >= 8) badgeColor = '#ef4444';

                      return (
                        <tr key={t._id} onClick={() => handleOpenDrawer(t, true)}>
                          <td style={{ fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>#{t.ticketNumber}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 600 }}>{t.subject}</td>
                          <td style={{ fontWeight: 800, color: badgeColor }}>{t.ageDays} d</td>
                          <td><span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: badgeColor }}>{t.bucketName}</span></td>
                          <td><span className={`status-pill status-${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                          <td><span className={`priority-${t.priority || 'low'}`} style={{ textTransform: 'capitalize' }}>{t.priority || 'low'}</span></td>
                          {/* <td>
                            {t.resolvedBy?.name ? (
                              <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>{t.resolvedBy.name}</span>
                            ) : (
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>— Unassigned</span>
                            )}
                          </td> */}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: API & CONFIGURATION ── */}
      {activeTab === 'config' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>API & Configuration Settings</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-base)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', marginTop: '1rem' }}>
            <code style={{ flex: 1 }}>{showKey ? app_key : maskedKey}</code>
            <button onClick={() => setShowKey(s => !s)} className="btn btn-ghost">{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            <button onClick={copyKey} className="btn btn-ghost">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
        </div>
      )}

      {/* ── SIDE DRAWER / MODAL FOR TICKET DETAILS (READ-ONLY SUPPORTED) ── */}
      {selectedTicket && (
        <div className="drawer-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>#{selectedTicket.ticketNumber}</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2px 0 0 0' }}>
                  {selectedTicket.subject} {selectedTicket._isReadOnly && <span style={{ fontSize: '0.75rem', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 6, marginLeft: 8 }}>READ ONLY</span>}
                </h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedTicket(null)}><X size={18} /></button>
            </div>

            <div className="drawer-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`status-pill status-${selectedTicket.status}`}>{selectedTicket.status.replace('_', ' ')}</span>
                <span style={{ fontSize: '0.78rem', padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', textTransform: 'capitalize', fontWeight: 600 }}>Priority: {selectedTicket.priority || 'low'}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Created {new Date(selectedTicket.createdAt).toLocaleString()}</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Description</label>
                <div style={{ background: 'var(--bg-base)', padding: '1.1rem', borderRadius: 12, border: '1px solid var(--border)', whiteSpace: 'pre-wrap', fontSize: '0.93rem' }}>
                  {selectedTicket.description}
                </div>
              </div>

              {!selectedTicket._isReadOnly ? (
                <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 16, padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#c4b5fd' }}>Update Status & Comments</h4>
                  <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <select style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} value={drawerStatus} onChange={e => setDrawerStatus(e.target.value)}>
                      <option value="open">Open</option>
                      <option value="acknowledged">Acknowledged</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <textarea rows={3} style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} placeholder="Add note..." value={drawerComment} onChange={e => setDrawerComment(e.target.value)} />
                    <button type="submit" disabled={updatingStatus} className="btn btn-primary">Submit Update</button>
                  </form>
                </div>
              ) : (
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border)', borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  🔒 This view is strictly READ-ONLY as requested. Switch to Ticket Queue tab if you need to modify ticket status.
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Timeline</label>
                {(selectedTicket.comments || []).length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-base)', borderRadius: 10 }}>No updates yet.</div>
                ) : (
                  [...selectedTicket.comments].reverse().map((c, i) => (
                    <div key={i} style={{ background: 'var(--bg-base)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className={`status-pill status-${c.status}`}>{c.status}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.date ? new Date(c.date).toLocaleString() : ''}</span>
                      </div>
                      {c.comment && <p style={{ fontSize: '0.88rem', margin: 0 }}>{c.comment}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
