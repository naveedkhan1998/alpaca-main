package com.breeze.backend.service;

import com.breeze.backend.dto.InstrumentDto;

import java.util.List;

public interface InstrumentService {
    List<InstrumentDto> searchInstruments(String exchange, String search);
}
