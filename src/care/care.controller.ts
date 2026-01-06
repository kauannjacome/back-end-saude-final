import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { CareService } from './care.service';
import { CreateCareDto } from './dto/create-care.dto';
import { UpdateCareDto } from './dto/update-care.dto';

@Controller('care')
export class CareController {
  constructor(private readonly careService: CareService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCareDto: CreateCareDto) {
    return this.careService.create(createCareDto);
  }

  @Get('search')
  search(
    @Query('subscriber_id', ParseIntPipe) subscriber_id: number,
    @Query('term') term?: string,
  ) {
    return this.careService.search(subscriber_id, term);
  }

  @Get()
  findAll() {
    return this.careService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.careService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCareDto: UpdateCareDto,
  ) {
    return this.careService.update(id, updateCareDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.careService.remove(id);
  }
}
