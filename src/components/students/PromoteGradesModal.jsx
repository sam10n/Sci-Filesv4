const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUpCircle, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { currentSchoolYearStart, formatSchoolYear, gradeForSchoolYear, applySchoolYear } from "@/lib/grades";

export default function PromoteGradesModal({ open, onClose, students, onSuccess }) {
  const [yearStart, setYearStart] = useState(currentSchoolYearStart());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setYearStart(currentSchoolYearStart());
  }, [open]);

  const yearOptions = useMemo(() => {
    const base = currentSchoolYearStart();
    return Array.from({ length: 13 }, (_, i) => base - 6 + i);
  }, []);

  const tracked = useMemo(() => students.filter((s) => s.grade_number != null), [students]);

  const groups = useMemo(() => {
    const map = new Map();
    tracked.forEach((s) => {
      const grade = gradeForSchoolYear(s, yearStart);
      if (grade == null) return;
      const key = grade > 12 ? 99 : grade;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [tracked, yearStart]);

  const shifted = useMemo(
    () => tracked.filter((s) => gradeForSchoolYear(s, yearStart) !== s.grade_number).length,
    [tracked, yearStart]
  );

  const step = (delta) => {
    const idx = yearOptions.indexOf(yearStart);
    const next = yearOptions[idx + delta];
    if (next != null) setYearStart(next);
  };

  const handleApply = async () => {
    const updates = tracked.map((s) => applySchoolYear(s, yearStart)).filter(Boolean);
    if (updates.length === 0) return;
    setSaving(true);
    try {
      await db.entities.Student.bulkUpdate(updates);
      toast({ title: "Grades updated", description: `${updates.length} student(s) set to ${formatSchoolYear(yearStart)}.` });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: "Promotion failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-blue-600" /> School Year
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Scroll to a school year. Moving forward promotes students, moving back returns them to their previous grade.
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => step(-1)}
              disabled={yearOptions.indexOf(yearStart) <= 0 || saving}
              aria-label="Previous school year"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select value={String(yearStart)} onValueChange={(v) => setYearStart(Number(v))}>
              <SelectTrigger className="flex-1 text-center font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{formatSchoolYear(y)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => step(1)}
              disabled={yearOptions.indexOf(yearStart) >= yearOptions.length - 1 || saving}
              aria-label="Next school year"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-4 space-y-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {tracked.length} student{tracked.length !== 1 ? "s" : ""} in {formatSchoolYear(yearStart)}
            </p>
            {groups.map(([key, count]) => (
              <p key={key} className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                {key === 99 && <GraduationCap className="w-3.5 h-3.5" />}
                {key === 99 ? "Graduated" : `Grade ${key}`} — {count} student{count !== 1 ? "s" : ""}
              </p>
            ))}
            {tracked.length === 0 && (
              <p className="text-xs text-blue-500 dark:text-blue-400">Add a grade level to your students first.</p>
            )}
            {tracked.length > 0 && (
              <p className="text-xs text-blue-500 dark:text-blue-400 pt-1">
                {shifted} student{shifted !== 1 ? "s" : ""} will change grade
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleApply} disabled={saving || tracked.length === 0}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Applying...</> : `Apply ${formatSchoolYear(yearStart)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}