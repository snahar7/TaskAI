import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Download, 
  Edit3, 
  MessageSquare, 
  Share2, 
  Clock,
  User,
  Tag,
  Save,
  X,
  Send,
  AtSign,
  Eye,
  Users,
  FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FileViewerProps {
  fileId: number | null;
  onClose: () => void;
}

interface FileComment {
  id: number;
  content: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  mentions?: number[];
  createdAt: string;
}

interface FileActivity {
  id: number;
  type: 'comment' | 'edit' | 'view' | 'share';
  userId: number;
  userName: string;
  content?: string;
  createdAt: string;
}

export function FileViewer({ fileId, onClose }: FileViewerProps) {
  const [activeTab, setActiveTab] = useState<'view' | 'comments' | 'activity'>('view');
  const [editMode, setEditMode] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [viewers, setViewers] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch file details
  const { data: file, isLoading: fileLoading } = useQuery({
    queryKey: ['file', fileId],
    queryFn: async () => {
      if (!fileId) return null;
      const response = await apiRequest('GET', `/api/files/${fileId}`);
      return response.json();
    },
    enabled: !!fileId
  });

  // Helper functions first
  const isTextFile = (mimeType: string | null | undefined): boolean => {
    if (!mimeType) return false;
    return mimeType.startsWith('text/') || 
           ['application/json', 'application/javascript', 'application/xml'].includes(mimeType) ||
           mimeType.includes('javascript') || mimeType.includes('typescript');
  };

  const isImageFile = (mimeType: string | null | undefined): boolean => {
    return mimeType?.startsWith('image/') ?? false;
  };

  const isPdfFile = (mimeType: string | null | undefined): boolean => {
    return mimeType === 'application/pdf';
  };

  const extractMentions = (content: string): number[] => {
    // Simple mention extraction - in real implementation, you'd use a more sophisticated parser
    const mentions = content.match(/@(\w+)/g) || [];
    // Convert to user IDs (stub implementation)
    return mentions.map(() => Math.floor(Math.random() * 100));
  };

  // Fetch file content for text files
  const { data: fileContent, isLoading: contentLoading } = useQuery({
    queryKey: ['file-content', fileId],
    queryFn: async () => {
      if (!fileId || !file) return null;
      if (!isTextFile(file.mimeType)) return null;
      
      const response = await apiRequest('GET', `/api/files/${fileId}/content`);
      return response.text();
    },
    enabled: !!fileId && !!file && isTextFile(file?.mimeType)
  });

  // Fetch comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['file-comments', fileId],
    queryFn: async () => {
      if (!fileId) return [];
      const response = await apiRequest('GET', `/api/files/${fileId}/comments`);
      return response.json();
    },
    enabled: !!fileId
  });

  // Fetch activity log
  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['file-activity', fileId],
    queryFn: async () => {
      if (!fileId) return [];
      const response = await apiRequest('GET', `/api/files/${fileId}/activity`);
      return response.json();
    },
    enabled: !!fileId
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/files/${fileId}/comments`, {
        content,
        mentions: extractMentions(content)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-comments', fileId] });
      queryClient.invalidateQueries({ queryKey: ['file-activity', fileId] });
      setNewComment('');
      toast({ title: 'Comment added successfully' });
    }
  });

  // Save file content mutation
  const saveContentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('PUT', `/api/files/${fileId}/content`, {
        content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-content', fileId] });
      queryClient.invalidateQueries({ queryKey: ['file-activity', fileId] });
      setEditMode(false);
      toast({ title: 'File saved successfully' });
    }
  });

  // Real-time viewers simulation
  useEffect(() => {
    if (!fileId) return;
    
    // Simulate real-time viewers
    const interval = setInterval(() => {
      setViewers(prev => {
        const newViewers = [...prev];
        if (Math.random() > 0.7 && newViewers.length < 3) {
          newViewers.push(`User ${Math.floor(Math.random() * 100)}`);
        }
        if (Math.random() > 0.8 && newViewers.length > 0) {
          newViewers.splice(Math.floor(Math.random() * newViewers.length), 1);
        }
        return newViewers;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fileId]);

  const handleSaveContent = () => {
    if (!editedContent) return;
    saveContentMutation.mutate(editedContent);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  if (!fileId) return null;

  return (
    <Dialog open={!!fileId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <DialogTitle className="text-lg">{file?.fileName || 'Loading...'}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{file?.mimeType}</Badge>
                  <span>•</span>
                  <span>{file?.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}</span>
                  <span>•</span>
                  <span>{file?.createdAt ? formatDistanceToNow(new Date(file.createdAt), { addSuffix: true }) : ''}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Real-time viewers */}
              {viewers.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">{viewers.length} viewing</span>
                </div>
              )}
              
              <Button variant="ghost" size="sm" onClick={() => window.open(file?.fileUrl, '_blank')}>
                <Download className="h-4 w-4" />
              </Button>
              
              {isTextFile(file?.mimeType) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setEditMode(!editMode);
                    if (!editMode && fileContent) {
                      setEditedContent(fileContent);
                    }
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'view'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-4 w-4 inline mr-2" />
            View
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'comments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-2" />
            Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Activity
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'view' && (
            <div className="h-full">
              {fileLoading || contentLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : editMode && isTextFile(file?.mimeType) ? (
                <div className="h-full flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border">
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      <Edit3 className="h-4 w-4 inline mr-1" />
                      Edit mode - Make your changes below
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSaveContent}
                        disabled={saveContentMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditMode(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none"
                    placeholder="File content..."
                  />
                </div>
              ) : (
                <FileRenderer file={file} content={fileContent} />
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map((comment: FileComment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment... Use @username to mention someone"
                    rows={2}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="h-full overflow-y-auto p-4">
              <div className="space-y-3">
                {activity.map((item: FileActivity) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 mt-1">
                      {item.type === 'comment' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                      {item.type === 'edit' && <Edit3 className="h-4 w-4 text-green-600" />}
                      {item.type === 'view' && <Eye className="h-4 w-4 text-gray-600" />}
                      {item.type === 'share' && <Share2 className="h-4 w-4 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{item.userName}</span>
                      <span className="text-muted-foreground">
                        {item.type === 'comment' && ' commented'}
                        {item.type === 'edit' && ' edited the file'}
                        {item.type === 'view' && ' viewed the file'}
                        {item.type === 'share' && ' shared the file'}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </div>
                      {item.content && (
                        <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 rounded p-2">
                          {item.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// File renderer component for different file types
function FileRenderer({ file, content }: { file: any; content: string | undefined }) {
  if (!file) return null;

  if (file.mimeType?.startsWith('text/') || content !== undefined) {
    return (
      <div className="h-full">
        <pre className="h-full overflow-auto p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900 rounded border">
          {content || 'Loading content...'}
        </pre>
      </div>
    );
  }

  if (file.mimeType?.startsWith('image/')) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded border">
        <img 
          src={file.fileUrl} 
          alt={file.fileName}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (file.mimeType === 'application/pdf') {
    return (
      <div className="h-full">
        <iframe
          src={file.fileUrl}
          className="w-full h-full border-0 rounded"
          title={file.fileName}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded border">
      <div className="text-center">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-muted-foreground">
          Preview not available for this file type
        </p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => window.open(file.fileUrl, '_blank')}
        >
          <Download className="h-4 w-4 mr-2" />
          Download to view
        </Button>
      </div>
    </div>
  );
}