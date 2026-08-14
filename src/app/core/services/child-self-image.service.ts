import { Injectable } from '@angular/core';
import { AvatarService } from './avatar.service';

export interface ResolvedAvatar {
  url: string | null;
  alt: string | null;
}

/**
 * Compatibility facade used by existing profile, dashboard, family, and login
 * screens. The avatar rules themselves live only in AvatarService.
 */
@Injectable({ providedIn: 'root' })
export class ChildSelfImageService {
  constructor(private readonly avatarService: AvatarService) {}

  resolveAvatarFromUser(user: any): ResolvedAvatar {
    return this.resolve(user);
  }

  resolveAvatarForMember(member: any): ResolvedAvatar {
    return this.resolve(member);
  }

  private resolve(person: any): ResolvedAvatar {
    if (!person) return { url: null, alt: null };

    const avatar = this.avatarService.getAvatarForUser(person);
    return {
      url: avatar.value,
      alt: person.name ? `${person.name} avatar` : avatar.label
    };
  }
}
