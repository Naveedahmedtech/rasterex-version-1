import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommentStatusIconComponent } from './comment-status-icon.component';

describe('CommentStatusIconComponent', () => {
  let component: CommentStatusIconComponent;
  let fixture: ComponentFixture<CommentStatusIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CommentStatusIconComponent]
    });
    fixture = TestBed.createComponent(CommentStatusIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
