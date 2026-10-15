import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  FolderGit2,
  Zap,
  Calendar,
  Megaphone,
  FileText,
  Image as ImageIcon,
  Search,
  RefreshCw,
  Plus,
  ShieldCheck,
  Building2,
  Clock,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Tag,
  AlertCircle,
  Edit2,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { SchemaStatusBanner } from '../../components/common/SchemaStatusBanner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import {
  fetchTenantProjects,
  fetchTenantActivities,
  fetchTenantEvents,
  fetchTenantAnnouncements,
  fetchTenantDocuments,
  fetchTenantMedia,
  createTenantProject,
  updateTenantProject,
  createTenantActivity,
  updateTenantActivity,
  createTenantEvent,
  updateTenantEvent,
  createTenantAnnouncement,
  updateTenantAnnouncement,
  createTenantDocument,
  updateTenantDocument,
  createTenantMediaItem,
  updateTenantMediaItem,
} from '../../services/contentService';
import type {
  CivicProject,
  CivicActivity,
  CivicEvent,
  CivicAnnouncement,
  CivicDocument,
  CivicMediaItem,
  SchemaTableStatus,
} from '../../types/content.types';

import { ProjectEditorModal } from '../../components/content/ProjectEditorModal';
import { ActivityEditorModal } from '../../components/content/ActivityEditorModal';
import { EventEditorModal } from '../../components/content/EventEditorModal';
import { AnnouncementEditorModal } from '../../components/content/AnnouncementEditorModal';
import { DocumentEditorModal } from '../../components/content/DocumentEditorModal';
import { MediaEditorModal } from '../../components/content/MediaEditorModal';
import { MediaVideoPlayer, isVideoSourceUrl } from '../../components/content/MediaVideoPlayer';
import {
  setActiveModalState,
  getActiveModalState,
  clearActiveModalState,
} from '../../utils/draftStorage';
import { formatNaira } from '../../utils/currency';

type ContentTab = 'projects' | 'activities' | 'events' | 'announcements' | 'documents' | 'media';

export const ContentModulePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeTenant, isContentLearningManager, isPlatformOwner, roleDisplayName } = useTenant();
  const { t } = useLanguage();

  // Active tab state synced with URL search params
  const activeTab = (searchParams.get('tab') as ContentTab) || 'projects';
  const handleTabChange = (tab: ContentTab) => {
    setSearchParams({ tab });
  };

  const isManager = isContentLearningManager || isPlatformOwner;

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Data states
  const [projects, setProjects] = useState<CivicProject[]>([]);
  const [activities, setActivities] = useState<CivicActivity[]>([]);
  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [announcements, setAnnouncements] = useState<CivicAnnouncement[]>([]);
  const [documents, setDocuments] = useState<CivicDocument[]>([]);
  const [media, setMedia] = useState<CivicMediaItem[]>([]);

  // Modal states
  const [editingProject, setEditingProject] = useState<CivicProject | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [editingActivity, setEditingActivity] = useState<CivicActivity | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const [editingEvent, setEditingEvent] = useState<CivicEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const [editingAnnouncement, setEditingAnnouncement] = useState<CivicAnnouncement | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  const [editingDocument, setEditingDocument] = useState<CivicDocument | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  const [editingMedia, setEditingMedia] = useState<CivicMediaItem | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Schema & error states per tab
  const [tableStatuses, setTableStatuses] = useState<Record<ContentTab, SchemaTableStatus>>({
    projects: 'ready',
    activities: 'ready',
    events: 'ready',
    announcements: 'ready',
    documents: 'ready',
    media: 'ready',
  });
  const [errorMessages, setErrorMessages] = useState<Record<ContentTab, string>>({
    projects: '',
    activities: '',
    events: '',
    announcements: '',
    documents: '',
    media: '',
  });

  // Track initial load per tab so tab switches still show initial loader once, but background refreshes do not blank content
  const [loadedTabs, setLoadedTabs] = useState<Record<ContentTab, boolean>>({
    projects: false,
    activities: false,
    events: false,
    announcements: false,
    documents: false,
    media: false,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isBackground = false) => {
    if (!activeTenant) return;
    
    // Only show full-page loading spinner if this tab hasn't loaded data yet and it's not a background refresh
    const isInitialTabLoad = !loadedTabs[activeTab] && !isBackground;
    if (isInitialTabLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setActionError(null);

    try {
      if (activeTab === 'projects') {
        const res = await fetchTenantProjects(activeTenant.id);
        setProjects(res.data);
        setTableStatuses((prev) => ({ ...prev, projects: res.tableStatus }));
        setErrorMessages((prev) => ({ ...prev, projects: res.error || '' }));
      } else if (activeTab === 'activities') {
        // Also load projects for dropdown in activity modal
        const [actRes, projRes] = await Promise.all([
          fetchTenantActivities(activeTenant.id),
          fetchTenantProjects(activeTenant.id),
        ]);
        setActivities(actRes.data);
        setProjects(projRes.data);
        setTableStatuses((prev) => ({ ...prev, activities: actRes.tableStatus }));
        setErrorMessages((prev) => ({ ...prev, activities: actRes.error || '' }));
      } else if (activeTab === 'events') {
        const res = await fetchTenantEvents(activeTenant.id);
        setEvents(res.data);
        setTableStatuses((prev) => ({ ...prev, events: res.tableStatus }));
        setErrorMessages((prev) => ({ ...prev, events: res.error || '' }));
      } else if (activeTab === 'announcements') {
        const res = await fetchTenantAnnouncements(activeTenant.id);
        setAnnouncements(res.data);
        setTableStatuses((prev) => ({ ...prev, announcements: res.tableStatus }));
        setErrorMessages((prev) => ({ ...prev, announcements: res.error || '' }));
      } else if (activeTab === 'documents') {
        const res = await fetchTenantDocuments(activeTenant.id);
        setDocuments(res.data);
        setTableStatuses((prev) => ({ ...prev, documents: res.tableStatus }));
        setErrorMessages((prev) => ({ ...prev, documents: res.error || '' }));
      } else if (activeTab === 'media') {
        const res = await fetchTenantMedia(activeTenant.id);
        setMedia(res.data);
        setTableStatuses((prev) => ({ ...prev, media: res.tableStatus }));
        setErrorMessages((prev) => ({ ...prev, media: res.error || '' }));
      }
      setLoadedTabs((prev) => ({ ...prev, [activeTab]: true }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [activeTenant?.id, activeTab]);

  // Content Editor Modal Restoration on mount / tenant change
  useEffect(() => {
    if (!activeTenant) return;

    const savedModal = getActiveModalState();
    if (!savedModal) return;

    // Tenant isolation: if stored tenant doesn't match active tenant, clear and do not restore
    if (savedModal.tenantId !== activeTenant.id) {
      clearActiveModalState();
      return;
    }

    const contentTypes = ['project', 'activity', 'event', 'announcement', 'document', 'media'];
    if (!contentTypes.includes(savedModal.type)) {
      return; // Not a Content page modal (e.g. could be course or lesson)
    }

    // CREATE MODE RESTORATION
    if (savedModal.mode === 'create') {
      if (savedModal.type === 'project') {
        setEditingProject(null);
        setIsProjectModalOpen(true);
      } else if (savedModal.type === 'activity') {
        setEditingActivity(null);
        setIsActivityModalOpen(true);
      } else if (savedModal.type === 'event') {
        setEditingEvent(null);
        setIsEventModalOpen(true);
      } else if (savedModal.type === 'announcement') {
        setEditingAnnouncement(null);
        setIsAnnouncementModalOpen(true);
      } else if (savedModal.type === 'document') {
        setEditingDocument(null);
        setIsDocumentModalOpen(true);
      } else if (savedModal.type === 'media') {
        setEditingMedia(null);
        setIsMediaModalOpen(true);
      }
      return;
    }

    // EDIT MODE RESTORATION
    if (savedModal.mode === 'edit') {
      if (!savedModal.id) {
        clearActiveModalState();
        return;
      }

      const targetId = savedModal.id;
      const tenantId = activeTenant.id;

      if (savedModal.type === 'project') {
        const found = projects.find((p) => p.id === targetId);
        if (found) {
          setEditingProject(found);
          setIsProjectModalOpen(true);
        } else {
          fetchTenantProjects(tenantId).then((res) => {
            const item = res.data.find((p) => p.id === targetId);
            if (item) {
              setEditingProject(item);
              setIsProjectModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      } else if (savedModal.type === 'activity') {
        const found = activities.find((a) => a.id === targetId);
        if (found) {
          setEditingActivity(found);
          setIsActivityModalOpen(true);
        } else {
          fetchTenantActivities(tenantId).then((res) => {
            const item = res.data.find((a) => a.id === targetId);
            if (item) {
              setEditingActivity(item);
              setIsActivityModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      } else if (savedModal.type === 'event') {
        const found = events.find((e) => e.id === targetId);
        if (found) {
          setEditingEvent(found);
          setIsEventModalOpen(true);
        } else {
          fetchTenantEvents(tenantId).then((res) => {
            const item = res.data.find((e) => e.id === targetId);
            if (item) {
              setEditingEvent(item);
              setIsEventModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      } else if (savedModal.type === 'announcement') {
        const found = announcements.find((a) => a.id === targetId);
        if (found) {
          setEditingAnnouncement(found);
          setIsAnnouncementModalOpen(true);
        } else {
          fetchTenantAnnouncements(tenantId).then((res) => {
            const item = res.data.find((a) => a.id === targetId);
            if (item) {
              setEditingAnnouncement(item);
              setIsAnnouncementModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      } else if (savedModal.type === 'document') {
        const found = documents.find((d) => d.id === targetId);
        if (found) {
          setEditingDocument(found);
          setIsDocumentModalOpen(true);
        } else {
          fetchTenantDocuments(tenantId).then((res) => {
            const item = res.data.find((d) => d.id === targetId);
            if (item) {
              setEditingDocument(item);
              setIsDocumentModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      } else if (savedModal.type === 'media') {
        const found = media.find((m) => m.id === targetId);
        if (found) {
          setEditingMedia(found);
          setIsMediaModalOpen(true);
        } else {
          fetchTenantMedia(tenantId).then((res) => {
            const item = res.data.find((m) => m.id === targetId);
            if (item) {
              setEditingMedia(item);
              setIsMediaModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      }
    }
  }, [activeTenant?.id]);

  const currentTableStatus = tableStatuses[activeTab];
  const currentErrorMessage = errorMessages[activeTab];

  // Tab definitions
  const tabs = [
    { id: 'projects' as ContentTab, name: t('content.tabProjects'), singularName: 'Project', icon: FolderGit2, count: projects.length, table: 'projects', cols: ['id', 'tenant_id', 'title', 'description', 'status', 'budget', 'location', 'created_at'] },
    { id: 'activities' as ContentTab, name: t('content.tabActivities'), singularName: 'Activity', icon: Zap, count: activities.length, table: 'activities', cols: ['id', 'tenant_id', 'project_id', 'title', 'description', 'type', 'status', 'points_reward', 'created_at'] },
    { id: 'events' as ContentTab, name: t('content.tabEvents'), singularName: 'Event', icon: Calendar, count: events.length, table: 'events', cols: ['id', 'tenant_id', 'title', 'description', 'event_type', 'venue', 'start_time', 'end_time', 'created_at'] },
    { id: 'announcements' as ContentTab, name: t('content.tabAnnouncements'), singularName: 'Announcement', icon: Megaphone, count: announcements.length, table: 'announcements', cols: ['id', 'tenant_id', 'title', 'summary', 'content', 'priority', 'is_published', 'created_at'] },
    { id: 'documents' as ContentTab, name: t('content.tabDocuments'), singularName: 'Document', icon: FileText, count: documents.length, table: 'documents', cols: ['id', 'tenant_id', 'title', 'file_name', 'file_type', 'file_size', 'file_url', 'category', 'is_public', 'created_at'] },
    { id: 'media' as ContentTab, name: t('content.tabMedia'), singularName: 'Media Asset', icon: ImageIcon, count: media.length, table: 'media', cols: ['id', 'tenant_id', 'title', 'media_type', 'url', 'thumbnail_url', 'album', 'caption', 'created_at'] },
  ];

  const currentTabMeta = tabs.find((t) => t.id === activeTab)!;

  // Filtered items
  const filteredProjects = useMemo(() => {
    return projects.filter((p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [projects, searchQuery]);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [activities, searchQuery]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.venue && e.venue.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [events, searchQuery]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.summary && a.summary.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [announcements, searchQuery]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const filteredMedia = useMemo(() => {
    return media.filter((m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.caption && m.caption.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [media, searchQuery]);

  // Save Handlers
  const handleSaveProject = async (data: {
    title: string;
    description?: string;
    status: CivicProject['status'];
    category?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
    location?: string;
  }): Promise<boolean> => {
    if (!activeTenant) {
      const err = 'No active tenant workspace selected. Please reload and try again.';
      setActionError(err);
      throw new Error(err);
    }
    setActionError(null);
    try {
      if (editingProject) {
        const res = await updateTenantProject(activeTenant.id, editingProject.id, data);
        if (res.error) {
          setActionError(res.error);
          throw new Error(res.error);
        }
      } else {
        const res = await createTenantProject(activeTenant.id, data);
        if (res.error) {
          setActionError(res.error);
          throw new Error(res.error);
        }
      }
      clearActiveModalState();
      await loadData(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      throw err;
    }
  };

  const handleSaveActivity = async (data: {
    project_id?: string;
    title: string;
    description?: string;
    type?: string;
    status: CivicActivity['status'];
    date?: string;
    points_reward?: number;
  }): Promise<boolean> => {
    if (!activeTenant) return false;
    if (editingActivity) {
      const res = await updateTenantActivity(activeTenant.id, editingActivity.id, data);
      if (res.error) throw new Error(res.error);
    } else {
      const res = await createTenantActivity(activeTenant.id, data);
      if (res.error) throw new Error(res.error);
    }
    clearActiveModalState();
    await loadData(true);
    return true;
  };

  const handleSaveEvent = async (data: {
    title: string;
    description?: string;
    event_type: CivicEvent['event_type'];
    venue?: string;
    start_time: string;
    end_time?: string;
    is_virtual?: boolean;
    meeting_link?: string;
    capacity?: number;
  }): Promise<boolean> => {
    if (!activeTenant) {
      const err = 'No active tenant workspace selected. Please reload and try again.';
      setActionError(err);
      throw new Error(err);
    }
    setActionError(null);
    try {
      if (editingEvent) {
        const res = await updateTenantEvent(activeTenant.id, editingEvent.id, data);
        if (res.error) {
          setActionError(res.error);
          throw new Error(res.error);
        }
      } else {
        const res = await createTenantEvent(activeTenant.id, data);
        if (res.error) {
          setActionError(res.error);
          throw new Error(res.error);
        }
      }
      clearActiveModalState();
      await loadData(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      throw err;
    }
  };

  const handleSaveAnnouncement = async (data: {
    title: string;
    summary?: string;
    content: string;
    priority: CivicAnnouncement['priority'];
    is_published: boolean;
  }): Promise<boolean> => {
    if (!activeTenant) return false;
    if (editingAnnouncement) {
      const res = await updateTenantAnnouncement(activeTenant.id, editingAnnouncement.id, data);
      if (res.error) throw new Error(res.error);
    } else {
      const res = await createTenantAnnouncement(activeTenant.id, {
        ...data,
        author_id: user?.id,
      });
      if (res.error) throw new Error(res.error);
    }
    clearActiveModalState();
    await loadData(true);
    return true;
  };

  const handleSaveDocument = async (data: {
    title: string;
    description?: string;
    file_name: string;
    file_type?: string;
    file_size?: number;
    file_url: string;
    category: CivicDocument['category'];
    is_public?: boolean;
  }): Promise<boolean> => {
    if (!activeTenant) {
      const err = 'No active tenant workspace selected. Please reload and try again.';
      setActionError(err);
      throw new Error(err);
    }
    setActionError(null);
    try {
      if (editingDocument) {
        const res = await updateTenantDocument(activeTenant.id, editingDocument.id, data);
        if (res.error) {
          setActionError(res.error);
          throw new Error(res.error);
        }
      } else {
        const res = await createTenantDocument(activeTenant.id, data);
        if (res.error) {
          setActionError(res.error);
          throw new Error(res.error);
        }
      }
      clearActiveModalState();
      await loadData(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      throw err;
    }
  };

  const handleSaveMedia = async (data: {
    title: string;
    caption?: string;
    media_type: CivicMediaItem['media_type'];
    url: string;
    thumbnail_url?: string;
    album?: string;
    file_size?: number;
  }): Promise<boolean> => {
    if (!activeTenant) return false;
    if (editingMedia) {
      const res = await updateTenantMediaItem(activeTenant.id, editingMedia.id, data);
      if (res.error) throw new Error(res.error);
    } else {
      const res = await createTenantMediaItem(activeTenant.id, data);
      if (res.error) throw new Error(res.error);
    }
    clearActiveModalState();
    await loadData(true);
    return true;
  };

  const handleOpenCreateModal = () => {
    if (!activeTenant) return;
    if (activeTab === 'projects') {
      setActiveModalState({ tenantId: activeTenant.id, type: 'project', mode: 'create', id: null });
      setEditingProject(null);
      setIsProjectModalOpen(true);
    } else if (activeTab === 'activities') {
      setActiveModalState({ tenantId: activeTenant.id, type: 'activity', mode: 'create', id: null });
      setEditingActivity(null);
      setIsActivityModalOpen(true);
    } else if (activeTab === 'events') {
      setActiveModalState({ tenantId: activeTenant.id, type: 'event', mode: 'create', id: null });
      setEditingEvent(null);
      setIsEventModalOpen(true);
    } else if (activeTab === 'announcements') {
      setActiveModalState({ tenantId: activeTenant.id, type: 'announcement', mode: 'create', id: null });
      setEditingAnnouncement(null);
      setIsAnnouncementModalOpen(true);
    } else if (activeTab === 'documents') {
      setActiveModalState({ tenantId: activeTenant.id, type: 'document', mode: 'create', id: null });
      setEditingDocument(null);
      setIsDocumentModalOpen(true);
    } else if (activeTab === 'media') {
      setActiveModalState({ tenantId: activeTenant.id, type: 'media', mode: 'create', id: null });
      setEditingMedia(null);
      setIsMediaModalOpen(true);
    }
  };

  if (!activeTenant) {
    return (
      <EmptyState
        title="No Active Tenant Selected"
        description="Please select a tenant workspace to view content & media operations."
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
              <span>{activeTenant.name}</span>
              <span aria-hidden="true">·</span>
              <span>{t('content.title')}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 break-words">
              {t('content.title')}
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed break-words">
              {t('content.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-500">{t('tenant.activeRole')}:</span>
              <span className="font-semibold text-slate-900">{roleDisplayName}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isLoading || isRefreshing}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              title={t('action.refresh')}
              aria-label={t('action.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {isManager && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'projects' && t('content.addProject')}
                  {activeTab === 'activities' && t('content.addActivity')}
                  {activeTab === 'events' && t('content.addEvent')}
                  {activeTab === 'announcements' && t('content.addAnnouncement')}
                  {activeTab === 'documents' && t('content.addDocument')}
                  {activeTab === 'media' && t('content.addMedia')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile-first horizontal scrollable tabs */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all shadow-2xs ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                  {tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Action Error Alert */}
      {actionError && <ErrorAlert message={actionError} onRetry={loadData} />}

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('content.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-shadow"
          />
        </div>
      </div>

      {/* Schema / RLS Alert Banner if table is not yet ready or unauthorized */}
      <SchemaStatusBanner
        tableName={currentTabMeta.table}
        tableStatus={currentTableStatus}
        errorMessage={currentErrorMessage}
        expectedColumns={currentTabMeta.cols}
        onRetry={() => loadData(false)}
      />

      {/* Loading state */}
      {isLoading ? (
        <div className="py-12 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-center">
          <LoadingSpinner message={t('state.loading')} />
        </div>
      ) : currentTableStatus === 'ready' ? (
        /* Tab Content when table is ready */
        <div className="space-y-4">
          {/* TAB 1: PROJECTS */}
          {activeTab === 'projects' && (
            filteredProjects.length === 0 ? (
              <EmptyState
                icon={FolderGit2}
                title={t('empty.noProjects')}
                description={`There are currently no active public projects recorded in ${activeTenant.name}. New initiatives will appear here once published.`}
                actionLabel={isManager ? t('content.createFirstProject') : undefined}
                onAction={isManager ? handleOpenCreateModal : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{p.title}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {p.description || 'No description provided.'}
                      </p>
                      {p.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{p.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.budget !== null && p.budget !== undefined && (
                          <span className="font-mono font-semibold text-slate-800 mr-2" title="Project Budget">
                            {formatNaira(p.budget)}
                          </span>
                        )}
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTenant) {
                              setActiveModalState({
                                tenantId: activeTenant.id,
                                type: 'project',
                                mode: 'edit',
                                id: p.id,
                              });
                            }
                            setEditingProject(p);
                            setIsProjectModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{t('action.edit')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 2: ACTIVITIES */}
          {activeTab === 'activities' && (
            filteredActivities.length === 0 ? (
              <EmptyState
                icon={Zap}
                title={t('empty.noActivities')}
                description={`Community tasks, volunteer programs, and civic action activities for ${activeTenant.name} will appear here.`}
                actionLabel={isManager ? t('content.createFirstActivity') : undefined}
                onAction={isManager ? handleOpenCreateModal : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActivities.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{a.title}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {a.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {a.description || 'No description provided.'}
                      </p>
                      {a.type && (
                        <span className="inline-block text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {a.type}
                        </span>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 font-mono font-bold text-amber-600">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>+{a.points_reward || 0} pts</span>
                      </div>
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTenant) {
                              setActiveModalState({
                                tenantId: activeTenant.id,
                                type: 'activity',
                                mode: 'edit',
                                id: a.id,
                              });
                            }
                            setEditingActivity(a);
                            setIsActivityModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{t('action.edit')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 3: EVENTS */}
          {activeTab === 'events' && (
            filteredEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={t('empty.noEvents')}
                description={`Town halls, public forums, and stakeholder sessions for ${activeTenant.name} will appear on this calendar.`}
                actionLabel={isManager ? t('content.createFirstEvent') : undefined}
                onAction={isManager ? handleOpenCreateModal : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{e.title}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                          {e.event_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {e.description || 'No description provided.'}
                      </p>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{new Date(e.start_time).toLocaleString()}</span>
                        </div>
                        {e.venue && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{e.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{e.is_virtual ? t('events.virtual') : t('events.inPerson')}</span>
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTenant) {
                              setActiveModalState({
                                tenantId: activeTenant.id,
                                type: 'event',
                                mode: 'edit',
                                id: e.id,
                              });
                            }
                            setEditingEvent(e);
                            setIsEventModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{t('action.edit')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 4: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            filteredAnnouncements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={t('empty.noAnnouncements')}
                description={`Tenant alerts, emergency updates, and public statements for ${activeTenant.name} will appear here.`}
                actionLabel={isManager ? t('content.postAnnouncement') : undefined}
                onAction={isManager ? handleOpenCreateModal : undefined}
              />
            ) : (
              <div className="space-y-3">
                {filteredAnnouncements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            a.priority === 'urgent'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : a.priority === 'important'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {a.priority}
                          </span>
                          {!a.is_published && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200">
                              {t('state.draft')}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(a.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">{a.title}</h3>
                      </div>
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTenant) {
                              setActiveModalState({
                                tenantId: activeTenant.id,
                                type: 'announcement',
                                mode: 'edit',
                                id: a.id,
                              });
                            }
                            setEditingAnnouncement(a);
                            setIsAnnouncementModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{t('action.edit')}</span>
                        </button>
                      )}
                    </div>
                    {a.summary && (
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                        {a.summary}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {a.content}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 5: DOCUMENTS */}
          {activeTab === 'documents' && (
            filteredDocuments.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={t('empty.noDocuments')}
                description={`Official gazettes, financial disclosures, policies, and ordinances for ${activeTenant.name} will be listed here.`}
                actionLabel={isManager ? t('content.addDocument') : undefined}
                onAction={isManager ? handleOpenCreateModal : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocuments.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{d.title}</h4>
                        <span className="text-[11px] text-slate-400 block truncate font-mono">{d.file_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTenant) {
                              setActiveModalState({
                                tenantId: activeTenant.id,
                                type: 'document',
                                mode: 'edit',
                                id: d.id,
                              });
                            }
                            setEditingDocument(d);
                            setIsDocumentModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          title="Edit Document"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        title="Download Document"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 6: PHOTOS / MEDIA */}
          {activeTab === 'media' && (
            filteredMedia.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title={t('empty.noMedia')}
                description={`Photo galleries, project photos, and community media for ${activeTenant.name} will appear in this repository.`}
                actionLabel={isManager ? t('content.addMedia') : undefined}
                onAction={isManager ? handleOpenCreateModal : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMedia.map((m) => {
                  const isVideo = m.media_type === 'video' || isVideoSourceUrl(m.url);
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-2 pb-3 flex flex-col justify-between"
                    >
                      <div>
                        {isVideo ? (
                          <MediaVideoPlayer
                            url={m.url}
                            title={m.title}
                            thumbnailUrl={m.thumbnail_url}
                          />
                        ) : (
                          <div className="w-full h-40 bg-slate-100 overflow-hidden flex items-center justify-center">
                            <img
                              src={m.thumbnail_url || m.url}
                              alt={m.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback for broken image
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="px-3 pt-2">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{m.title}</h4>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                              {isVideo ? t('domain.video') : m.media_type}
                            </span>
                          </div>
                          {m.caption && (
                            <p className="text-[11px] text-slate-500 truncate">{m.caption}</p>
                          )}
                        </div>
                      </div>
                      {isManager && (
                        <div className="px-3 pt-1 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeTenant) {
                                setActiveModalState({
                                  tenantId: activeTenant.id,
                                  type: 'media',
                                  mode: 'edit',
                                  id: m.id,
                                });
                              }
                              setEditingMedia(m);
                              setIsMediaModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{t('action.edit')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      ) : null}

      {/* ==================================================================== */}
      {/* MODALS */}
      {/* ==================================================================== */}
      <ProjectEditorModal
        project={editingProject}
        isOpen={isProjectModalOpen}
        onClose={() => {
          clearActiveModalState();
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
      />

      <ActivityEditorModal
        activity={editingActivity}
        projects={projects}
        isOpen={isActivityModalOpen}
        onClose={() => {
          clearActiveModalState();
          setIsActivityModalOpen(false);
          setEditingActivity(null);
        }}
        onSave={handleSaveActivity}
      />

      <EventEditorModal
        event={editingEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          clearActiveModalState();
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
      />

      <AnnouncementEditorModal
        announcement={editingAnnouncement}
        isOpen={isAnnouncementModalOpen}
        onClose={() => {
          clearActiveModalState();
          setIsAnnouncementModalOpen(false);
          setEditingAnnouncement(null);
        }}
        onSave={handleSaveAnnouncement}
      />

      <DocumentEditorModal
        documentItem={editingDocument}
        isOpen={isDocumentModalOpen}
        onClose={() => {
          clearActiveModalState();
          setIsDocumentModalOpen(false);
          setEditingDocument(null);
        }}
        onSave={handleSaveDocument}
      />

      <MediaEditorModal
        mediaItem={editingMedia}
        isOpen={isMediaModalOpen}
        onClose={() => {
          clearActiveModalState();
          setIsMediaModalOpen(false);
          setEditingMedia(null);
        }}
        onSave={handleSaveMedia}
      />
    </div>
  );
};
