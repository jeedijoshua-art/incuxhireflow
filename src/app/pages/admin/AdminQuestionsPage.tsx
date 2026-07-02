import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Filter, Edit2, Trash2, Power, PowerOff, X } from "lucide-react";
import { 
  fetchQuestions, 
  createQuestion, 
  updateQuestion, 
  deleteQuestion, 
  toggleQuestion 
} from "../../utils/adminApi";

type Difficulty = "Easy" | "Medium" | "Hard";

interface QuestionModel {
  id: string;
  question: string;
  role: string;
  category: string;
  difficulty: Difficulty;
  expectedTime: number; // in seconds
  isEnabled: boolean;
}

const CATEGORIES = ["HR", "Frontend", "Backend", "React", "JavaScript", "Python", "Java", "C++", "Database", "Operating Systems", "Computer Networks", "Cloud", "DevOps", "Behavioral", "Aptitude"];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<QuestionModel>>({
    question: "", role: "", category: "Frontend", difficulty: "Medium", expectedTime: 120, isEnabled: true
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const data = await fetchQuestions();
      setQuestions(data || []);
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    (q.question || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (q.role || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (question?: QuestionModel) => {
    if (question) {
      setEditingQuestion(question);
      setFormData(question);
    } else {
      setEditingQuestion(null);
      setFormData({ question: "", role: "", category: "Frontend", difficulty: "Medium", expectedTime: 120, isEnabled: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, formData);
      } else {
        await createQuestion(formData);
      }
      await loadQuestions();
      closeModal();
    } catch (error) {
      console.error("Failed to save question:", error);
      alert("Error saving question");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteQuestion(id);
        await loadQuestions();
      } catch (error) {
        console.error("Failed to delete question:", error);
        alert("Error deleting question");
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleQuestion(id);
      await loadQuestions();
    } catch (error) {
      console.error("Failed to toggle question status:", error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">Question Bank</h1>
          <p className="text-zinc-400">Manage technical and behavioral questions for interviews.</p>
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
            Add Question
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
              placeholder="Search questions, roles, or categories..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/[0.06] rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>
          <div className="text-sm text-zinc-500 hidden sm:block">
            {filteredQuestions.length} Questions
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.04] text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="p-4 pl-6 w-1/3">Question</th>
                <th className="p-4">Role</th>
                <th className="p-4">Category</th>
                <th className="p-4">Difficulty</th>
                <th className="p-4">Time</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-sm">
                    Loading questions...
                  </td>
                </tr>
              ) : filteredQuestions.map((q) => (
                <tr key={q.id} className={`hover:bg-white/[0.02] transition-colors ${!q.isEnabled ? 'opacity-50' : ''}`}>
                  <td className="p-4 pl-6">
                    <div className="text-sm font-medium text-zinc-200 line-clamp-2">{q.question}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-zinc-400">{q.role}</span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 bg-white/[0.04] text-zinc-300 text-xs font-medium rounded border border-white/[0.08]">
                      {q.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${q.difficulty === 'Easy' ? 'text-emerald-400' : q.difficulty === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-400">
                    {Math.floor(q.expectedTime / 60)}m {q.expectedTime % 60 > 0 ? `${q.expectedTime % 60}s` : ''}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${q.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {q.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggleStatus(q.id)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors" title={q.isEnabled ? "Disable" : "Enable"}>
                        {q.isEnabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openModal(q)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-blue-400 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-sm">
                    No questions found matching your search.
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
              className="bg-zinc-900 border border-white/[0.08] shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
                <h3 className="text-xl font-bold text-zinc-100">{editingQuestion ? "Edit Question" : "Add New Question"}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Question Text</label>
                  <textarea 
                    required
                    value={formData.question}
                    onChange={e => setFormData({...formData, question: e.target.value})}
                    rows={3}
                    className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-teal-500/50 resize-none"
                    placeholder="Enter the full interview question..."
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Target Role</label>
                    <input 
                      required
                      type="text"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-teal-500/50"
                      placeholder="e.g. Frontend Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-[#111] border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Difficulty</label>
                    <select 
                      value={formData.difficulty}
                      onChange={e => setFormData({...formData, difficulty: e.target.value as Difficulty})}
                      className="w-full bg-[#111] border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Expected Time (s)</label>
                    <input 
                      required
                      type="number"
                      min="30"
                      step="30"
                      value={formData.expectedTime}
                      onChange={e => setFormData({...formData, expectedTime: parseInt(e.target.value)})}
                      className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Status</label>
                    <select 
                      value={formData.isEnabled ? "Active" : "Disabled"}
                      onChange={e => setFormData({...formData, isEnabled: e.target.value === "Active"})}
                      className="w-full bg-[#111] border border-white/[0.06] rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50"
                    >
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/[0.04]">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black text-sm font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                    {editingQuestion ? "Save Changes" : "Add Question"}
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
