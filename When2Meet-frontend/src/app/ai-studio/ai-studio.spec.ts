import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiStudioComponent } from './ai-studio';

describe('AiStudioComponent', () => {
  let component: AiStudioComponent;
  let fixture: ComponentFixture<AiStudioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiStudioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AiStudioComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
