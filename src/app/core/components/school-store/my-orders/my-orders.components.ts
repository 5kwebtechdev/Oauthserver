
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

interface Order {
    id: number;
    status: string;
    deliveryDate: string;
    subStatus: string;
    productName: string;
    subtitle: string;
    schoolName: string;
    imageSrc: string;
}

@Component({
    selector: 'my-orders',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, EmptyStateComponent, MindfulButtonComponent],
    templateUrl: './my-orders.components.html',
    styleUrls: ['./my-orders.components.scss']
})
export class MyOrdersComponent {
    isFilterScreenVisible = false;
    selectedStatus: string[] = [];
    selectedTime: string = '';
    appliedStatus: string[] = [];
    appliedTime: string = '';

    orders: Order[] = [
        {
            id: 1,
            status: 'on-the-way',
            deliveryDate: 'Arriving Thurs, 19th Feb',
            subStatus: 'On the way',
            productName: 'The Mindful Teen',
            subtitle: 'NCERT',
            schoolName: 'Springfield High School',
            imageSrc: 'assets/School-assets/temp/Maths Book.jpg'
        },
        {
            id: 2,
            status: 'delivered',
            deliveryDate: 'Delivered on Sunday 8th Feb',
            subStatus: 'Delivered',
            productName: 'Mindful Workbook',
            subtitle: 'CBSE',
            schoolName: 'Green Valley School',
            imageSrc: 'assets/School-assets/temp/English.jpg'
        },
        {
            id: 3,
            status: 'returned-exchanged',
            deliveryDate: 'Return / Exchange',
            subStatus: 'Your return is scheduled',
            productName: 'Teen Wellness Kit',
            subtitle: 'ICSE',
            schoolName: 'Blue Ridge Academy',
            imageSrc: 'assets/School-assets/temp/Blazer.jpg'
        },
        {
            id: 4,
            status: 'delayed',
            deliveryDate: 'Delayed, Arriving Thurs, 19th Feb',
            subStatus: 'Delayed',
            productName: 'Mindful Journal',
            subtitle: 'State Board',
            schoolName: 'Sunnydale High',
            imageSrc: 'assets/School-assets/temp/Notebook.jpg'
        },
        {
            id: 5,
            status: 'cancelled',
            deliveryDate: 'Cancelled',
            subStatus: 'Your refund is completed',
            productName: 'Stress Relief Cards',
            subtitle: 'NCERT',
            schoolName: 'Riverside School',
            imageSrc: 'assets/School-assets/temp/Shirt-l.jpg'
        },
        {
            id: 6,
            status: 'returned-exchanged',
            deliveryDate: 'Return / Exchange',
            subStatus: 'Your refund is completed',
            productName: 'Mindful Coloring Book',
            subtitle: 'CBSE',
            schoolName: 'Hilltop Academy',
            imageSrc: 'assets/School-assets/temp/Shirt.jpg'
        },
        {
            id: 7,
            status: 'returned-exchanged',
            deliveryDate: 'Return / Exchange',
            subStatus: 'Pickup Failed',
            productName: 'Relaxation Audio',
            subtitle: 'ICSE',
            schoolName: 'Valley View School',
            imageSrc: 'assets/School-assets/temp/Shorts.jpg'
        },
        {
            id: 8,
            status: 'cancelled',
            deliveryDate: 'Cancelled',
            subStatus: 'Your refund is initiated',
            productName: 'Breathing Exercises Guide',
            subtitle: 'State Board',
            schoolName: 'Mountain High',
            imageSrc: 'assets/School-assets/temp/T-Shirt.jpg'
        }
    ];

    goBack(): void {
        if (this.isFilterScreenVisible) {
            this.closeFilterScreen();
        } else {
            try { window.history.back(); } catch (e) { }
        }
    }

    openFilterScreen(): void {
        this.isFilterScreenVisible = true;
    }

    closeFilterScreen(): void {
        this.isFilterScreenVisible = false;
    }

    onStatusChange(event: any, value: string): void {
        if (event.target.checked) {
            this.selectedStatus.push(value);
        } else {
            this.selectedStatus = this.selectedStatus.filter(s => s !== value);
        }
    }

    onTimeChange(value: string): void {
        this.selectedTime = value;
    }

    applyFilters(): void {
        this.appliedStatus = [...this.selectedStatus];
        this.appliedTime = this.selectedTime;
        this.closeFilterScreen();
    }

    get filteredOrders(): Order[] {
        return this.orders.filter(order => {
            const statusMatch = this.appliedStatus.length === 0 || this.appliedStatus.includes(order.status);
            // For simplicity, assume all orders match time, or add time logic if needed
            return statusMatch;
        });
    }

    get resultsText(): string {
        if (this.appliedTime) {
            return `Results from ${this.getTimeDisplay(this.appliedTime)}`;
        } else if (this.appliedStatus.length > 0) {
            const statusDisplays = this.appliedStatus.map(s => this.getStatusDisplay(s));
            return `Results from ${statusDisplays.join(', ')}`;
        } else {
            return 'Results from All Orders';
        }
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'on-the-way':
                return '#90214D';
            case 'delivered':
                return '#4CAF50';
            case 'delayed':
            case 'cancelled':
                return '#BB2124';
            default:
                return '';
        }
    }

    getSubStatusColor(subStatus: string): string {
        if (subStatus === 'On the way') return '#90214D';
        if (subStatus === 'Delivered') return '#4CAF50';
        if (subStatus === 'Delayed') return '#BB2124';
        if (subStatus === 'Cancelled') return '#BB2124';
        if (subStatus.includes('Failed')) return '#BB2124';
        if (subStatus.includes('refund') || subStatus.includes('return')) return '#4CAF50';
        return '';
    }

    truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    private getStatusDisplay(value: string): string {
        const map: { [key: string]: string } = {
            'on-the-way': 'On the way',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
            'returned-exchanged': 'Returned / Exchanged'
        };
        return map[value] || value;
    }

    private getTimeDisplay(value: string): string {
        const map: { [key: string]: string } = {
            'last-30-days': 'Last 30 days',
            'last-3-months': 'Last 3 months',
            'last-6-months': 'Last 6 months',
            'older': 'Older'
        };
        return map[value] || value;
    }
}
