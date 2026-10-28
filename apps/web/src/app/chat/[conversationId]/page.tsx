'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ConversationRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to main chat page
    router.replace('/chat');
  }, [params, router]);

  return null;
}
