import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CareController } from './care.controller';
import { CareService } from './care.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../auth/common/auth.constants';

describe('CareController', () => {
  let app: INestApplication;
  const mockCareService = {
    checkMinDeadline: jest.fn(),
  };

  beforeAll(async () => {
    mockCareService.checkMinDeadline.mockResolvedValue({
      care_id: 1,
      patient_id: 2,
      has_min_deadline: true,
      min_deadline_days: 30,
      eligible: false,
      last_regulation: {
        id: 10,
        date: new Date('2025-01-01T00:00:00.000Z'),
      },
      days_since_last: 10,
      days_remaining: 20,
      next_allowed_date: new Date('2025-01-31T00:00:00.000Z'),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CareController],
      providers: [
        {
          provide: CareService,
          useValue: mockCareService,
        },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req[REQUEST_TOKEN_PAYLOAD_NAME] = {
            sub_id: 123,
            user_id: 456,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /care/min-deadline/check returns status and calls service', async () => {
    await request(app.getHttpServer())
      .get('/care/min-deadline/check?care_id=1&patient_id=2')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          care_id: 1,
          patient_id: 2,
          has_min_deadline: true,
          min_deadline_days: 30,
          eligible: false,
          days_since_last: 10,
          days_remaining: 20,
        });
      });

    expect(mockCareService.checkMinDeadline).toHaveBeenCalledWith(1, 2, 123);
  });
});
