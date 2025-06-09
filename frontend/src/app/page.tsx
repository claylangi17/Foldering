"use client"; // Required for form interactions

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
  // This component will not render anything as redirect will happen on the server.
  // You can optionally return null or a loading spinner if needed, but redirect is usually sufficient.
  return null;
}
