const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Plus, CheckCircle2, Circle, Trash2, Edit2, Loader2, ClipboardList, CalendarClock, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskFormModal from "@/components/board/TaskFormModal";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, differenceInCalendarDays, isPast } from "date-fns";

const priorityStyles = {
  high: { label: "High", cls: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400", dot: "bg-red-500" },
  medium: { label: "Medium", cls: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400", dot: "bg-amber-500" },
  low: { label: "Low", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", dot: "bg-slate-400" },
};

function dueBadge(dueDate, completed) {
  if (!dueDate) return null;
  try {
    const date = parseISO(dueDate);
    const days = differenceInCalendarDays(date, new Date());
    let text, cls;
    if (completed) {
      text = format(date, "MMM d");
      cls = "text-slate-400";
    } else if (isPast(date) && days < 0) {
      text = `${Math.abs(days)}d overdue`;
      cls = "text-red-600 dark:text-red-400 font-medium";
    } else if (days === 0) {
      text = "Due today";
      cls = "text-amber-600 dark:text-amber-400 font-medium";
    } else if (days === 1) {
      text = "Due tomorrow";
      cls = "text-amber-600 dark:text-amber-400";
    } else if (days <= 7) {
      text = `Due in ${days}d`;
      cls = "text-slate-500 dark:text-slate-400";
    } else {
      text = format(date, "MMM d");
      cls = "text-slate-400";
    }
    return { text, cls };
  } catch {
    return null;
  }
}

export default function Board() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const { toast } = useToast();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["board-tasks"],
    queryFn: async () => db.entities.BoardTask.list("-created_date", 200),
  });

  const tasks = data ?? [];

  const toggleComplete = async (task) => {
    try {
      await db.entities.BoardTask.update(task.id, { completed: !task.completed });
      refetch();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTask) return;
    try {
      await db.entities.BoardTask.delete(deleteTask.id);
      toast({ title: "Task deleted" });
      refetch();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteTask(null);
  };

  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  // Sort open tasks: by due date (nulls last), then by priority
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const sortedOpen = [...open].sort((a, b) => {
    const ad = a.due_date ? parseISO(a.due_date).getTime() : Infinity;
    const bd = b.due_date ? parseISO(b.due_date).getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
  });

  const overdueCount = open.filter((t) => t.due_date && isPast(parseISO(t.due_date))).length;

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100">My Board</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isFetching ? "Refreshing..." : "Your task list and deadlines"}
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditTask(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-400 font-medium">To do</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{open.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-400 font-medium">Done</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{done.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-400 font-medium">Overdue</p>
            <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>{overdueCount}</p>
          </div>
        </div>

        {/* Open tasks */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">To Do ({sortedOpen.length})</h2>
          {sortedOpen.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No pending tasks</p>
              <p className="text-sm text-slate-400 mt-1">Add a task to start your checklist</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedOpen.map((task) => {
                const p = priorityStyles[task.priority] || priorityStyles.medium;
                const badge = dueBadge(task.due_date, task.completed);
                return (
                  <div key={task.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3">
                    <button onClick={() => toggleComplete(task)} className="shrink-0 mt-0.5 text-slate-300 hover:text-green-500 transition-colors">
                      <Circle className="w-6 h-6" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 break-words">{task.title}</h3>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditTask(task); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTask(task)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {task.notes && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 break-words">{task.notes}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} /> {p.label}
                        </span>
                        {badge && (
                          <span className={`inline-flex items-center gap-1 text-xs ${badge.cls}`}>
                            <CalendarClock className="w-3.5 h-3.5" /> {badge.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed tasks */}
        {done.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Completed ({done.length})</h2>
            <div className="space-y-2">
              {done.map((task) => {
                const p = priorityStyles[task.priority] || priorityStyles.medium;
                const badge = dueBadge(task.due_date, task.completed);
                return (
                  <div key={task.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3 opacity-70">
                    <button onClick={() => toggleComplete(task)} className="shrink-0 mt-0.5 text-green-500 hover:text-slate-300 transition-colors">
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-500 dark:text-slate-400 line-through break-words">{task.title}</h3>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditTask(task); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTask(task)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {task.notes && <p className="text-sm text-slate-400 mt-1 break-words">{task.notes}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} /> {p.label}
                        </span>
                        {badge && (
                          <span className={`inline-flex items-center gap-1 text-xs ${badge.cls}`}>
                            <CalendarClock className="w-3.5 h-3.5" /> {badge.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <TaskFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditTask(null); }} task={editTask} onSuccess={refetch} />

      <AlertDialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTask?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PullToRefresh>
  );
}