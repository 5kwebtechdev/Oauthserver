import { inject, REQUEST_CONTEXT } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, ResolveFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { Article } from '../pages/learning-section/learning.models';

export const articleLinkGuard: CanActivateFn = (route, state) => {
  if (!/^[1-9]\d*$/.test(route.paramMap.get('slug') || '') || inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const articleSlugResolver: ResolveFn<{ id?: number; article?: Article; error?: string }> = async route => {
  const http = inject(HttpClient);
  const context = inject(REQUEST_CONTEXT, { optional: true }) as { article?: Article } | null;
  const slug = route.paramMap.get('slug') || '';
  if (context?.article?.slug === slug) return { article: context.article };
  // Legacy numeric links still use authenticated ID detail. No anonymous ID
  // resolver exists in the backend, so never guess a slug from a title.
  if (/^[1-9]\d*$/.test(slug)) {
    return inject(AuthService).isLoggedIn()
      ? { id: Number(slug) }
      : { error: 'This article link is unavailable.' };
  }
  try {
    const article = await firstValueFrom(http.get<Article>(`${environment.apiUrl}/public/articles/${encodeURIComponent(slug)}`));
    return article?.id ? { article } : { error: 'This article link is unavailable.' };
  } catch (error) {
    return { error: (error as { status?: number }).status === 404 ? 'Article not found' : 'Article temporarily unavailable. Please try again.' };
  }
};
