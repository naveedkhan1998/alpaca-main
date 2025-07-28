package com.breeze.backend.service;

import com.breeze.backend.dto.BreezeAccountDto;

import java.util.List;

public interface BreezeAccountService {
    List<BreezeAccountDto> getBreezeAccounts();
    BreezeAccountDto createBreezeAccount(BreezeAccountDto breezeAccountDto);
    BreezeAccountDto updateBreezeAccount(Long id, BreezeAccountDto breezeAccountDto);
}
