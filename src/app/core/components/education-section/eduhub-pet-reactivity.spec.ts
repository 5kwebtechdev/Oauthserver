import { ElementRef } from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';
import {PetAgeService} from '../../services/pet-age.service';
import {TutorHeaderComponent} from './academy-design-header/tutor-header.component';
import {CounselorHeaderComponent} from './counselor-design/counselor-header/counselor-header.component';
import {EventHeaderComponent} from './event-design/event-header/event-header.component';
import {StationeryShopHeaderComponent} from './stationery-design/stationery-shop-header/stationery-shop-header.component';
import {BookstoreHeaderComponent} from './bookstore-design/bookstore-header/bookstore-header.component';
import {SportsShopHeaderComponent} from './sports-shop-design/sports-shop-header/sports-shop-header.component';
import {HostelHeaderComponent} from './hostel-design/hostel-header/hostel-header.component';
describe('EduHub selected pet reactivity',()=>{
it('TutorHeaderComponent follows selection changes',()=>{
 const state = new BehaviorSubject<any>({petType:'panda'});
 TestBed.configureTestingModule({providers:[{provide:ElementRef,useValue:new ElementRef(document.createElement('div'))},{provide:PetAgeService,useValue:{petData$:state.asObservable(),getCurrentPetData:()=>state.value}}]});
 const header:any = TestBed.runInInjectionContext(()=>new TutorHeaderComponent());
 expect(header.activePet()).toBe('panda');
 for(const pet of ['owl','dragon','llama','panda']) {
  state.next({petType:pet}); expect(header.activePet()).toBe(pet);
  expect(header.petAssets()).toContain('/pets/'+pet);
 }
});
it('CounselorHeaderComponent follows selection changes',()=>{
 const state = new BehaviorSubject<any>({petType:'panda'});
 TestBed.configureTestingModule({providers:[{provide:ElementRef,useValue:new ElementRef(document.createElement('div'))},{provide:PetAgeService,useValue:{petData$:state.asObservable(),getCurrentPetData:()=>state.value}}]});
 const header:any = TestBed.runInInjectionContext(()=>new CounselorHeaderComponent());
 expect(header.activePet()).toBe('panda');
 for(const pet of ['owl','dragon','llama','panda']) {
  state.next({petType:pet}); expect(header.activePet()).toBe(pet);
  expect(header.petAssets()).toContain('/pets/'+pet);
 }
});
it('EventHeaderComponent follows selection changes',()=>{
 const state = new BehaviorSubject<any>({petType:'panda'});
 TestBed.configureTestingModule({providers:[{provide:ElementRef,useValue:new ElementRef(document.createElement('div'))},{provide:PetAgeService,useValue:{petData$:state.asObservable(),getCurrentPetData:()=>state.value}}]});
 const header:any = TestBed.runInInjectionContext(()=>new EventHeaderComponent());
 expect(header.activePet()).toBe('panda');
 for(const pet of ['owl','dragon','llama','panda']) {
  state.next({petType:pet}); expect(header.activePet()).toBe(pet);
  expect(header.petAssets()).toContain('/pets/'+pet);
 }
});
it('StationeryShopHeaderComponent follows selection changes',()=>{
 const state = new BehaviorSubject<any>({petType:'panda'});
 TestBed.configureTestingModule({providers:[{provide:ElementRef,useValue:new ElementRef(document.createElement('div'))},{provide:PetAgeService,useValue:{petData$:state.asObservable(),getCurrentPetData:()=>state.value}}]});
 const header:any = TestBed.runInInjectionContext(()=>new StationeryShopHeaderComponent());
 expect(header.activePet()).toBe('panda');
 for(const pet of ['owl','dragon','llama','panda']) {
  state.next({petType:pet}); expect(header.activePet()).toBe(pet);
  expect(header.petAssets()).toContain('/pets/'+pet);
 }
});
it('BookstoreHeaderComponent follows selection changes',()=>{
 const state = new BehaviorSubject<any>({petType:'panda'});
 TestBed.configureTestingModule({providers:[{provide:ElementRef,useValue:new ElementRef(document.createElement('div'))},{provide:PetAgeService,useValue:{petData$:state.asObservable(),getCurrentPetData:()=>state.value}}]});
 const header:any = TestBed.runInInjectionContext(()=>new BookstoreHeaderComponent());
 expect(header.activePet()).toBe('panda');
 for(const pet of ['owl','dragon','llama','panda']) {
  state.next({petType:pet}); expect(header.activePet()).toBe(pet);
  expect(header.petAssets()).toContain('/pets/'+pet);
 }
});
it('SportsShopHeaderComponent follows selection changes',()=>{
 const state = new BehaviorSubject<any>({petType:'panda'});
 TestBed.configureTestingModule({providers:[{provide:ElementRef,useValue:new ElementRef(document.createElement('div'))},{provide:PetAgeService,useValue:{petData$:state.asObservable(),getCurrentPetData:()=>state.value}}]});
 const header:any = TestBed.runInInjectionContext(()=>new SportsShopHeaderComponent());
 expect(header.activePet()).toBe('panda');
 for(const pet of ['owl','dragon','llama','panda']) {
  state.next({petType:pet}); expect(header.activePet()).toBe(pet);
  expect(header.petAssets()).toContain('/pets/'+pet);
 }
});
it('HostelHeaderComponent follows selection changes',()=>{
 const state = new BehaviorSubject<any>({petType:'panda'});
 TestBed.configureTestingModule({providers:[{provide:ElementRef,useValue:new ElementRef(document.createElement('div'))},{provide:PetAgeService,useValue:{petData$:state.asObservable(),getCurrentPetData:()=>state.value}}]});
 const header:any = TestBed.runInInjectionContext(()=>new HostelHeaderComponent());
 expect(header.activePet()).toBe('panda');
 for(const pet of ['owl','dragon','llama','panda']) {
  state.next({petType:pet}); expect(header.activePet()).toBe(pet);
  expect(header.petAssets()).toContain('/pets/'+pet);
 }
});
});
