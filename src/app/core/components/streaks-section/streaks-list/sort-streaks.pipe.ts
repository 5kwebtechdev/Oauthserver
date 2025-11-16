import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'sortStreaks'
})
export class SortStreaksPipe implements PipeTransform {
    transform(items: any[]): any[] {
        if (!items) return [];
        return items.slice().sort((a, b) => b.highestStreak - a.highestStreak);
    }
}
