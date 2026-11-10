import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiStudio } from './ai-studio';

describe('AiStudio', () => {
  let component: AiStudio;
  let fixture: ComponentFixture<AiStudio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiStudio],
    }).compileComponents();

    fixture = TestBed.createComponent(AiStudio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
