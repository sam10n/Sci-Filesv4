const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { currentSchoolYearStart } from "@/lib/grades";

export default function StudentFormModal({ open, onClose, student, onSuccess }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [gradeNumber, setGradeNumber] = useState("");
  const [section, setSection] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (student) {
        setName(student.name || "");
        setGrade(student.grade || "");
        setGradeNumber(student.grade_number != null ? String(student.grade_number) : "");
        setSection(student.section || "");
        setStudentNumber(student.student_number || "");
        setAge(student.age != null ? String(student.age) : "");
        setAddress(student.address || "");
        setEmail(student.email || "");
        setNotes(student.notes || "");
      } else {
        setName("");
        setGrade("");
        setGradeNumber("");
        setSection("");
        setStudentNumber("");
        setAge("");
        setAddress("");
        setEmail("");
        setNotes("");
      }
    }
  }, [student, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const nextGradeNumber = gradeNumber ? parseInt(gradeNumber, 10) : null;
      const previousGradeNumber = student?.grade_number ?? null;
      const payload = {
        name: name.trim(),
        grade: grade.trim(),
        grade_number: nextGradeNumber,
        section: section.trim(),
        student_number: studentNumber.trim(),
        age: age ? parseInt(age, 10) : null,
        address: address.trim(),
        email: email.trim(),
        notes: notes.trim(),
      };
      if (nextGradeNumber != null && nextGradeNumber !== previousGradeNumber) {
        payload.base_grade_number = nextGradeNumber;
        payload.base_year_start = currentSchoolYearStart();
      }
      if (student) {
        await db.entities.Student.update(student.id, payload);
        toast({ title: "Student updated" });
      } else {
        await db.entities.Student.create(payload);
        toast({ title: "Student created" });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Add Student"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Grade Level (number)</Label>
              <Input type="number" value={gradeNumber} onChange={(e) => setGradeNumber(e.target.value)} placeholder="e.g. 10" />
              <p className="text-xs text-slate-400 mt-1">Used for auto-promotion</p>
            </div>
            <div>
              <Label>Grade / Class (display)</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. Grade 10 - A" />
              <p className="text-xs text-slate-400 mt-1">Auto-updated on promote</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Section</Label>
              <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Section A / B / C" />
            </div>
            <div>
              <Label>Age</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 16" />
            </div>
          </div>
          <div>
            <Label>Student LRN</Label>
            <Input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="e.g. 123456789012" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. firstname.lastname@school.edu" />
          </div>
          <div>
            <Label>Address</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={"House No., Street, Barangay, City, Province, ZIP Code"}
              rows={2}
            />
            <p className="text-xs text-slate-400 mt-1">Format: House No., Street, Barangay, City, Province, ZIP Code</p>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : student ? "Save Changes" : "Add Student"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}