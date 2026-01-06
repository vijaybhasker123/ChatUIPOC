import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PocChatComponent } from './poc-chat.component';

describe('PocChatComponent', () => {
  let component: PocChatComponent;
  let fixture: ComponentFixture<PocChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PocChatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PocChatComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
