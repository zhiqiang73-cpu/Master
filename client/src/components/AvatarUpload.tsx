import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AvatarUploadProps {
  currentUrl?: string | null;
  name?: string | null;
  onSuccess?: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-28 h-28",
};

export default function AvatarUpload({ currentUrl, name, onSuccess, size = "md" }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.member.uploadAvatar.useMutation({
    onSuccess: (data) => {
      toast.success("头像已更新");
      onSuccess?.(data.url);
      setPreview(null);
    },
    onError: (err) => {
      toast.error("上传失败：" + err.message);
      setPreview(null);
    },
    onSettled: () => setUploading(false),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片大小不能超过 2MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);

      // Extract base64 data (remove data:image/xxx;base64, prefix)
      const base64Data = dataUrl.split(",")[1];
      if (!base64Data) return;

      setUploading(true);
      uploadMutation.mutate({
        base64Data,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  const displayUrl = preview ?? currentUrl;
  const initials = name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  return (
    <div className="relative inline-block group">
      <Avatar className={`${sizeMap[size]} border-2 border-border`}>
        {displayUrl && <AvatarImage src={displayUrl} alt={name ?? "Avatar"} />}
        <AvatarFallback className="bg-[var(--patina)] text-white font-semibold text-lg">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Upload overlay */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        title="更换头像"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Camera className="w-5 h-5 text-white" />
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Size hint */}
      {size === "lg" && (
        <p className="text-xs text-muted-foreground mt-2 text-center">点击更换头像（最大 2MB）</p>
      )}
    </div>
  );
}
