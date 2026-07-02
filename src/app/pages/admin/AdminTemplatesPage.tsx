import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Filter, Edit2, Trash2, X, Copy } from "lucide-react";
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from "../../utils/adminApi";

interface TemplateModel {
  id: string;
  roleName: string;
  hrQuestions: number;
  technicalQuestions: number;
  behavioralQuestions: number;
  easyQuestions: number;
  mediumQuestions: number;
  hardQuestions: number;
  passingScore: number;
  status: string;
  totalDuration: number; // in minutes
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateModel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<TemplateModel>>({
    roleName: "", hrQuestions: 1, technicalQuestions: 3, behavioralQuestions: 1,
    easyQuestions: 2, mediumQuestions: 2, hardQuestions: 1, passingScore: 70, status: "Active", totalDuration: 30
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t => 
    (t.roleName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (template?: TemplateModel) => {
    if (template) {
      setEditingTemplate(template);
      setFormData(template);
    } else {
      setEditingTemplate(null);
      setFormData({ 
        roleName: "", hrQuestions: 1, technicalQuestions: 3, behavioralQuestions: 1, 
        easyQuestions: 2, mediumQuestions: 2, hardQuestions: 1, passingScore: 70, status: "Active", totalDuration: 30 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
      } else {
        await createTemplate(formData);
      }
      await loadTemplates();
      closeModal();
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Error saving template");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await deleteTemplate(id);
        await loadTemplates();
      } catch (error) {
        console.error("Failed to delete template:", error);
        alert("Error deleting template");
      }
    }
  };

  const handleDuplicate = async (template: TemplateModel) => {
    try {
      const copy = { ...template, roleName: `${template.roleName} (Copy)` };
      delete (copy as any).id;
      await createTemplate(copy);
      await loadTemplates();
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      alert("Error duplicating template");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">Interview Templates</h1>
          <p className="text-zinc-400">Design reusable question structures for different roles.</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(10,15,25,0.72)] border border-white/[0.08] hover:bg-white/[0.04] transition-colors rounded-lg text-sm font-medium text-zinc-200">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 transition-colors rounded-lg text-sm font-bold text-black"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search templates by role name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/[0.06] rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>
          <div className="text-sm text-zinc-500 hidden sm:block">
            {filteredTemplates.length} Templates
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.04] text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="p-4 pl-6">Role Name</th>
                <th className="p-4 text-center">HR Qs</th>
                <th className="p-4 text-center">Tech Qs</th>
                <th className="p-4 text-center">Behavioral Qs</th>
                <th className="p-4">Duration</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm">
                    Loading templates...
                  </td>
                </tr>
              ) : filteredTemplates.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-zinc-200">{t.roleName}</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${t.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                        {t.status || 'Active'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {(t.hrQuestions || 0) + (t.technicalQuestions || 0) + (t.behavioralQuestions || 0)} Total Questions | Pass: {t.passingScore || 70}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-sm font-medium text-zinc-300">
                      {t.hrQuestions || 0}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/10 text-sm font-medium text-teal-400 border border-teal-500/20">
                      {t.technicalQuestions || 0}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 text-sm font-medium text-violet-400 border border-violet-500/20">
                      {t.behavioralQuestions || 0}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-400">
                    {t.totalDuration || 0} mins
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleDuplicate(t)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors" title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => openModal(t)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-blue-400 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredTemplates.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm">
                    No templates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/[0.08] shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
                <h3 className="text-xl font-bold text-zinc-100">{editingTemplate ? "Edit Template" : "Create New Template"}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Role Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.roleName}
                    onChange={e => setFormData({...formData, roleName: e.target.value})}
                    className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-teal-500/50"
                    placeholder="e.g. Senior Frontend Developer"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">HR Questions</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      value={formData.hrQuestions}
                      onChange={e => setFormData({...formData, hrQuestions: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-teal-400 mb-1.5">Tech Questions</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      value={formData.technicalQuestions}
                      onChange={e => setFormData({...formData, technicalQuestions: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-violet-400 mb-1.5">Behavioral Qs</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      value={formData.behavioralQuestions}
                      onChange={e => setFormData({...formData, behavioralQuestions: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-green-400 mb-1.5">Easy Qs</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      value={formData.easyQuestions}
                      onChange={e => setFormData({...formData, easyQuestions: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-400 mb-1.5">Medium Qs</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      value={formData.mediumQuestions}
                      onChange={e => setFormData({...formData, mediumQuestions: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-400 mb-1.5">Hard Qs</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      value={formData.hardQuestions}
                      onChange={e => setFormData({...formData, hardQuestions: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Passing Score</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      max="100"
                      value={formData.passingScore}
                      onChange={e => setFormData({...formData, passingScore: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    >
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Total Duration (Minutes)</label>
                    <input 
                      required
                      type="number"
                      min="5"
                      step="5"
                      value={formData.totalDuration}
                      onChange={e => setFormData({...formData, totalDuration: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/[0.04]">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black text-sm font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                    {editingTemplate ? "Save Changes" : "Create Template"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
