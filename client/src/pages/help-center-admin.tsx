import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen, Plus, Pencil, Trash2, Eye, EyeOff,
  ArrowLeft, Save, Loader2, Image as ImageIcon
} from "lucide-react";

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string | null;
  order: number;
  isPublished: boolean;
  featuredImage?: string | null;
  tags?: string[] | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: "getting-started", name: "Getting Started" },
  { id: "clients", name: "Clients" },
  { id: "caregivers", name: "Caregivers" },
  { id: "scheduling", name: "Scheduling" },
  { id: "billing", name: "Billing & Payroll" },
  { id: "documents", name: "Documents" },
  { id: "compliance", name: "Compliance" },
  { id: "kiosk", name: "Kiosk Terminal" },
  { id: "api", name: "API Documentation" },
  { id: "settings", name: "Settings" },
  { id: "faq", name: "FAQ" },
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const emptyForm = {
  title: "",
  slug: "",
  category: "getting-started",
  subcategory: "",
  content: "",
  isPublished: true,
  featuredImage: "",
  tags: "",
  order: 0,
};

type FormState = typeof emptyForm;

export default function HelpCenterAdmin() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<HelpArticle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HelpArticle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugManual, setSlugManual] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: articles = [], isLoading } = useQuery<HelpArticle[]>({
    queryKey: ["/api/help-articles", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/help-articles?all=true", { credentials: "include" });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/help-articles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-articles"] });
      toast({ title: "Article created", description: "The article has been published." });
      setView("list");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/help-articles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-articles"] });
      toast({ title: "Article updated" });
      setView("list");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/help-articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-articles"] });
      toast({ title: "Article deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Error deleting article", variant: "destructive" }),
  });

  useEffect(() => {
    if (!slugManual && form.title && !editing) {
      setForm(f => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugManual, editing]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugManual(false);
    setView("form");
  };

  const openEdit = (article: HelpArticle) => {
    setEditing(article);
    setSlugManual(true);
    setForm({
      title: article.title,
      slug: article.slug,
      category: article.category,
      subcategory: article.subcategory || "",
      content: article.content,
      isPublished: article.isPublished,
      featuredImage: article.featuredImage || "",
      tags: (article.tags || []).join(", "),
      order: article.order ?? 0,
    });
    setView("form");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      subcategory: form.subcategory || null,
      featuredImage: form.featuredImage || null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      order: Number(form.order) || 0,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/help-articles/upload-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } finally {
      setUploading(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          {view === "list" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help Center Content</h1>
                    <p className="text-sm text-gray-500">Create and manage help articles for users</p>
                  </div>
                </div>
                <Button onClick={openNew} className="gap-2">
                  <Plus className="w-4 h-4" /> New Article
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading articles…</div>
              ) : articles.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">No custom articles yet.</p>
                    <Button onClick={openNew} variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" /> Create your first article
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {articles.map((article) => (
                    <Card key={article.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{article.title}</p>
                            {!article.isPublished && (
                              <Badge variant="secondary" className="text-xs">Draft</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{CATEGORIES.find(c => c.id === article.category)?.name || article.category}</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            /{article.slug} · {article.viewCount} views · updated {new Date(article.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(article)} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(article)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {view === "form" && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
              <div className="flex items-center gap-3 mb-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {editing ? "Edit Article" : "New Article"}
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Article title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })); }}
                    placeholder="article-slug"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={form.subcategory}
                    onChange={(e) => setForm(f => ({ ...f, subcategory: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={form.tags}
                    onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="evv, clock-in, kiosk"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featuredImage">Featured Image URL</Label>
                  <Input
                    id="featuredImage"
                    value={form.featuredImage}
                    onChange={(e) => setForm(f => ({ ...f, featuredImage: e.target.value }))}
                    placeholder="https://… or /uploads/…"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(v) => setForm(f => ({ ...f, isPublished: v }))}
                  id="published"
                />
                <Label htmlFor="published" className="cursor-pointer">
                  {form.isPublished ? (
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400"><Eye className="w-4 h-4" /> Published</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-gray-400"><EyeOff className="w-4 h-4" /> Draft (not visible to users)</span>
                  )}
                </Label>
                {uploading && <span className="text-xs text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading image…</span>}
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <RichTextEditor
                  content={form.content}
                  onChange={(html) => setForm(f => ({ ...f, content: html }))}
                  placeholder="Write your article content here. Use the toolbar to format text, insert images, and embed videos."
                  onImageUpload={handleImageUpload}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Save Changes" : "Create Article"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setView("list")}>Cancel</Button>
              </div>
            </form>
          )}

        </main>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently deleted and removed from the Help Center.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
