import AnonymousModeProvider from '@/components/board/AnonymousModeProvider';
import BoardColumn from '@/components/board/BoardColumn';
import PostProvider from '@/components/board/PostProvider';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { PostType } from '@/lib/constants/post';
import { Role } from '@/lib/constants/role';
import type { EnrichedPost } from '@/lib/signal/postSignals';
import { initializePostSignals } from '@/lib/signal/postSignals';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

const params = new URLSearchParams(location.search);
const guest = params.has('guest');
const post: EnrichedPost = {
  id: 'mock-post', boardId: 'mock', author: 'mock-member',
  content: localStorage.getItem('mock-post') ?? 'Migration baseline post',
  type: PostType.went_well, voteCount: 0,
  createdAt: new Date('2026-09-07T00:00:00Z'), updatedAt: new Date('2026-09-07T00:00:00Z'),
};
const markdown = '# Heading\n\n- One\n- Two\n\n[Link](https://example.com)\n\n> Quote\n\n```js\nconst value = 1;\n```\n\n| Column | Value |\n|---|---|\n| Table | Content |';
const posts = params.has('empty') ? [] : [post, { ...post, id: 'mock-task', type: PostType.action_item, content: markdown }];
initializePostSignals(posts, []);
const initials = { posts, members: [{ id: 'mock-membership', userId: 'mock-member', username: 'Test Member', email: 'test@example.invalid', role: Role.owner }], votedPosts: [], actions: [] };

function Editor() {
  const [role, setRole] = useState('member');
  const [deleted, setDeleted] = useState(false);
  return (
    <AnonymousModeProvider>
      <PostProvider initials={initials} boardId="mock">
        <main style={{ padding: 24, minHeight: 1800 }}>
          <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <Sheet><SheetTrigger asChild><Button>Navigation</Button></SheetTrigger>
              <SheetContent side="left"><SheetTitle>Navigation</SheetTitle><SheetDescription>Test navigation</SheetDescription><a href="#board">Board</a></SheetContent>
            </Sheet>
            <Select value={role} onValueChange={setRole}><SelectTrigger aria-label="Role" style={{ width: 140 }}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="guest">Guest</SelectItem></SelectContent>
            </Select>
            <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild><Button variant="outline">Help</Button></TooltipTrigger><TooltipContent>Board help</TooltipContent></Tooltip></TooltipProvider>
            {!deleted && <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Delete fixture</Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogTitle>Delete fixture?</AlertDialogTitle><AlertDialogDescription>Delete this test item.</AlertDialogDescription><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => setDeleted(true)}>Confirm</AlertDialogAction></AlertDialogContent>
            </AlertDialog>}
          </nav>
          <div id="board" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <BoardColumn boardId="mock" title="Went Well" postType={PostType.went_well} viewOnly={guest} userId="mock-member" />
            <BoardColumn boardId="mock" title="Action Items" postType={PostType.action_item} viewOnly={guest} userId="mock-member" />
          </div>
          <Toaster />
        </main>
      </PostProvider>
    </AnonymousModeProvider>
  );
}
createRoot(document.getElementById('root')!).render(<Editor />);
