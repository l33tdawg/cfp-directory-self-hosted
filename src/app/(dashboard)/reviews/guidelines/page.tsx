/**
 * Review Guidelines Page - Redirect
 * 
 * Guidelines have been moved to the main review queue page.
 * This page redirects to maintain backwards compatibility.
 */

import { redirect } from 'next/navigation';

export default function ReviewerGuidelinesPage() {
  redirect('/reviews');
}
