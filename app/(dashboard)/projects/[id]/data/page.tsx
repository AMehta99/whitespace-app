"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  File,
  FileText,
  FileSpreadsheet,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { FileType, ParsingStatus } from "@/types";

const fileTypeLabels: Record<FileType, string> = {
  cim: "CIM / Info Memo",
  financials: "Financial Model",
  scope: "Scope Document",
  market_research: "Market Research",
  customer_data: "Customer Data",
  other: "Other",
};

const fileTypeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  docx: FileText,
  default: File,
};

const statusIcons: Record<ParsingStatus, React.ElementType> = {
  pending: Clock,
  processing: Clock,
  complete: CheckCircle2,
  failed: AlertCircle,
};

const statusColors: Record<ParsingStatus, string> = {
  pending: "text-yellow-500",
  processing: "text-blue-500",
  complete: "text-green-500",
  failed: "text-red-500",
};

interface ProjectFile {
  id: string;
  file_name: string;
  file_type: FileType;
  parsing_status: ParsingStatus;
  created_at: string;
}

export default function ProjectDataPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<FileType>("other");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        await uploadFiles(droppedFiles);
      }
    },
    [selectedType]
  );

  const uploadFiles = async (filesToUpload: File[]) => {
    setUploading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      setUploading(false);
      return;
    }

    for (const file of filesToUpload) {
      // Upload to Supabase Storage
      const filePath = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // Create file record
      const { data: fileRecord, error: dbError } = await supabase
        .from("project_files")
        .insert({
          project_id: projectId,
          uploaded_by: user.id,
          file_name: file.name,
          file_type: selectedType,
          storage_path: filePath,
          parsing_status: "pending",
        })
        .select()
        .single();

      if (!dbError && fileRecord) {
        setFiles((prev) => [fileRecord, ...prev]);
      }
    }

    setUploading(false);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      await uploadFiles(selectedFiles);
    }
    e.target.value = "";
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const Icon = fileTypeIcons[ext] || fileTypeIcons.default;
    return <Icon className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Data & Files</h2>
        <p className="text-muted-foreground">
          Upload documents and data files for analysis
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>
              Drag and drop files or click to browse. Supported formats: PDF,
              Excel, CSV, Word
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="text-sm font-medium">File Type</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(Object.entries(fileTypeLabels) as [FileType, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setSelectedType(value)}
                      className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                        selectedType === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                Drag and drop your files here, or
              </p>
              <label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.docx,.doc"
                  disabled={uploading}
                />
                <Button variant="outline" disabled={uploading} asChild>
                  <span className="cursor-pointer">
                    {uploading ? "Uploading..." : "Browse Files"}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* File type guide */}
        <Card>
          <CardHeader>
            <CardTitle>File Types</CardTitle>
            <CardDescription>
              Tag your files to help Claude understand the data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm">CIM / Info Memo</p>
              <p className="text-xs text-muted-foreground">
                Confidential information memorandum or management presentation
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Financial Model</p>
              <p className="text-xs text-muted-foreground">
                Excel models with historical and projected financials
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Scope Document</p>
              <p className="text-xs text-muted-foreground">
                Deal scope, key questions, or analysis requirements
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Market Research</p>
              <p className="text-xs text-muted-foreground">
                Industry reports, competitor analysis, market studies
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Customer Data</p>
              <p className="text-xs text-muted-foreground">
                Customer lists, revenue breakdowns, usage data
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {files.map((file) => {
                const StatusIcon = statusIcons[file.parsing_status];
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center space-x-4">
                      {getFileIcon(file.file_name)}
                      <div>
                        <p className="font-medium">{file.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {fileTypeLabels[file.file_type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div
                        className={`flex items-center ${
                          statusColors[file.parsing_status]
                        }`}
                      >
                        <StatusIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm capitalize">
                          {file.parsing_status}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
