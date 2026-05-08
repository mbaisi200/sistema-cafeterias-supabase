'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { Database, CheckCircle, XCircle, Loader2, AlertTriangle, Building2, Trash2, CalendarDays, Layers, ChevronLeft, FileText } from 'lucide-react';

interface SeedStatus {
  step: string;
  status: 'pending' | 'running' | 'done' | 'error';
  count?: number;
  message?: string;
}

interface Empresa {
  id: string;
  nome: string;
  status?: string;
}

interface Segmento {
  id: string;
  nome: string;
}

interface SecaoMenu {
  id: string;
  nome: string;
  url?: string;
}

interface SecaoAtiva {
  secaoId: string;
  secaoNome: string;
  ativo: boolean;
}

const CORES_CATEGORIAS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
];

const NOMES_FUNCIONARIOS = [
  'Maria Silva', 'Ana Santos', 'Carlos Oliveira', 'Juliana Costa', 'Pedro Souza',
  'Fernanda Lima', 'Roberto Almeida', 'Camila Rodrigues'
];

const CARGOS = ['Atendente', 'Caixa', 'Gerente', 'Barista', 'Cozinheiro', 'Garçom'];

// Produtos por segmento — cada segmento tem seu catálogo específico
const PRODUTOS_POR_SEGMENTO: Record<string, Record<string, {nome: string, preco: number, custo: number}[]>> = {
  'Cafeteria': {
    'Bebidas Quentes': [
      { nome: 'Café Expresso', preco: 5.00, custo: 1.20 },
      { nome: 'Café Cappuccino', preco: 9.00, custo: 2.50 },
      { nome: 'Café Latte', preco: 10.00, custo: 2.80 },
      { nome: 'Mocha', preco: 12.00, custo: 3.50 },
      { nome: 'Chocolate Quente', preco: 8.00, custo: 2.20 },
      { nome: 'Chá Mate', preco: 4.50, custo: 1.00 },
      { nome: 'Chá de Camomila', preco: 5.00, custo: 1.20 },
      { nome: 'Café Americano', preco: 7.00, custo: 1.80 },
    ],
    'Bebidas Geladas': [
      { nome: 'Café Gelado', preco: 10.00, custo: 2.80 },
      { nome: 'Suco Natural Laranja', preco: 8.00, custo: 2.50 },
      { nome: 'Suco Natural Limão', preco: 7.00, custo: 2.00 },
      { nome: 'Milkshake Chocolate', preco: 14.00, custo: 4.50 },
      { nome: 'Milkshake Morango', preco: 14.00, custo: 4.50 },
      { nome: 'Refrigerante Lata', preco: 6.00, custo: 3.00 },
      { nome: 'Água Mineral', preco: 4.00, custo: 1.50 },
      { nome: 'Smoothie Frutas', preco: 15.00, custo: 5.00 },
    ],
    'Lanches': [
      { nome: 'Pão de Queijo (unid)', preco: 4.00, custo: 1.20 },
      { nome: 'Croissant Manteiga', preco: 7.00, custo: 2.50 },
      { nome: 'Croissant Presunto Queijo', preco: 10.00, custo: 3.50 },
      { nome: 'Sanduíche Natural', preco: 15.00, custo: 5.00 },
      { nome: 'Sanduíche Club', preco: 18.00, custo: 6.50 },
      { nome: 'X-Burguer', preco: 16.00, custo: 5.50 },
      { nome: 'X-Bacon', preco: 19.00, custo: 7.00 },
      { nome: 'Hot Dog', preco: 12.00, custo: 4.00 },
    ],
    'Doces': [
      { nome: 'Bolo de Chocolate (fatia)', preco: 10.00, custo: 3.50 },
      { nome: 'Bolo de Cenoura (fatia)', preco: 9.00, custo: 3.00 },
      { nome: 'Brigadeiro (unid)', preco: 3.50, custo: 1.00 },
      { nome: 'Beijinho (unid)', preco: 3.50, custo: 1.00 },
      { nome: 'Brownie', preco: 8.00, custo: 2.80 },
      { nome: 'Cheesecake (fatia)', preco: 12.00, custo: 4.50 },
      { nome: 'Torta de Maçã (fatia)', preco: 10.00, custo: 3.50 },
      { nome: 'Mousse de Maracujá', preco: 8.00, custo: 2.50 },
    ],
    'Combos': [
      { nome: 'Combo Café + Pão de Queijo', preco: 8.00, custo: 2.50 },
      { nome: 'Combo Cappuccino + Croissant', preco: 14.00, custo: 5.00 },
      { nome: 'Combo X-Burguer + Refrigerante', preco: 20.00, custo: 8.00 },
      { nome: 'Combo X-Bacon + Batata + Refri', preco: 35.00, custo: 13.00 },
    ],
  },
  'Restaurante': {
    'Entradas': [
      { nome: 'Bruschetta', preco: 18.00, custo: 5.00 },
      { nome: 'Ceviche', preco: 32.00, custo: 12.00 },
      { nome: 'Bolinho de Aipim', preco: 14.00, custo: 4.50 },
      { nome: 'Coxinha (6 un)', preco: 22.00, custo: 7.00 },
      { nome: 'Salada Caesar', preco: 24.00, custo: 7.50 },
      { nome: 'Sopa do Dia', preco: 16.00, custo: 4.00 },
    ],
    'Pratos Principais': [
      { nome: 'Filé Mignon', preco: 58.00, custo: 22.00 },
      { nome: 'Salmão Grelhado', preco: 62.00, custo: 25.00 },
      { nome: 'Risoto de Camarão', preco: 52.00, custo: 18.00 },
      { nome: 'Frango à Parmegiana', preco: 38.00, custo: 14.00 },
      { nome: 'Barriga de Porco', preco: 45.00, custo: 16.00 },
      { nome: 'Moqueca de Peixe', preco: 48.00, custo: 18.00 },
      { nome: 'Lasanha Bolonhesa', preco: 35.00, custo: 12.00 },
      { nome: 'Feijoada Completa', preco: 42.00, custo: 15.00 },
      { nome: 'Strogonoff', preco: 36.00, custo: 13.00 },
      { nome: 'Picanha na Chapa', preco: 65.00, custo: 28.00 },
    ],
    'Massas': [
      { nome: 'Spaghetti Carbonara', preco: 34.00, custo: 11.00 },
      { nome: 'Fettuccine Alfredo', preco: 30.00, custo: 9.50 },
      { nome: 'Gnocchi ao Pesto', preco: 28.00, custo: 8.50 },
      { nome: 'Ravioli de Queijo', preco: 32.00, custo: 10.00 },
      { nome: 'Nhoque à Bolonhesa', preco: 30.00, custo: 9.00 },
    ],
    'Sobremesas': [
      { nome: 'Pudim', preco: 14.00, custo: 4.00 },
      { nome: 'Petit Gateau', preco: 18.00, custo: 6.00 },
      { nome: 'Tiramisú', preco: 16.00, custo: 5.50 },
      { nome: 'Açaí na Tigela', preco: 20.00, custo: 8.00 },
      { nome: 'Crepe de Nutella', preco: 16.00, custo: 5.00 },
    ],
    'Bebidas': [
      { nome: 'Suco Natural', preco: 10.00, custo: 3.00 },
      { nome: 'Refrigerante', preco: 7.00, custo: 3.00 },
      { nome: 'Água', preco: 4.00, custo: 1.00 },
      { nome: 'Cerveja Artesanal', preco: 18.00, custo: 7.00 },
      { nome: 'Vinho Taça', preco: 22.00, custo: 8.00 },
      { nome: 'Caipirinha', preco: 16.00, custo: 5.00 },
      { nome: 'Limonada Suíça', preco: 10.00, custo: 3.00 },
    ],
    'Porções': [
      { nome: 'Batata Frita', preco: 22.00, custo: 7.00 },
      { nome: 'Onion Rings', preco: 24.00, custo: 8.00 },
      { nome: 'Polenta Frita', preco: 20.00, custo: 6.00 },
      { nome: 'Iscas de Frango', preco: 28.00, custo: 10.00 },
      { nome: 'Camarão Empanado', preco: 38.00, custo: 16.00 },
    ],
  },
  'Padaria': {
    'Pães': [
      { nome: 'Pão Francês (kg)', preco: 12.00, custo: 5.50 },
      { nome: 'Pão de Centeio', preco: 10.00, custo: 4.00 },
      { nome: 'Pão Integral', preco: 11.00, custo: 4.50 },
      { nome: 'Pão de Queijo (kg)', preco: 28.00, custo: 10.00 },
      { nome: 'Pão Doce', preco: 8.00, custo: 3.00 },
      { nome: 'Broa de Milho', preco: 8.00, custo: 3.00 },
      { nome: 'Pão Azeitona', preco: 12.00, custo: 5.00 },
      { nome: 'Bisnaguinha (pkg)', preco: 7.00, custo: 2.50 },
    ],
    'Doces e Tortas': [
      { nome: 'Bolo de Chocolate', preco: 35.00, custo: 12.00 },
      { nome: 'Bolo de Cenoura', preco: 32.00, custo: 10.00 },
      { nome: 'Torta de Limão', preco: 38.00, custo: 13.00 },
      { nome: 'Torta de Morango', preco: 42.00, custo: 16.00 },
      { nome: 'Croissant de Chocolate', preco: 7.00, custo: 2.50 },
      { nome: 'Sonho', preco: 8.00, custo: 3.00 },
      { nome: 'Risole', preco: 5.00, custo: 1.80 },
      { nome: 'Empada', preco: 5.50, custo: 2.00 },
    ],
    'Salgados': [
      { nome: 'Coxinha (unid)', preco: 5.50, custo: 2.00 },
      { nome: 'Kibe (unid)', preco: 5.00, custo: 1.80 },
      { nome: 'Esfiha de Carne', preco: 5.50, custo: 2.00 },
      { nome: 'Enroladinho', preco: 5.00, custo: 1.50 },
      { nome: 'Pastel de Carne', preco: 6.50, custo: 2.50 },
      { nome: 'Pastel de Queijo', preco: 6.00, custo: 2.20 },
    ],
    'Cafeteria': [
      { nome: 'Café Expresso', preco: 4.50, custo: 1.00 },
      { nome: 'Cappuccino', preco: 8.00, custo: 2.20 },
      { nome: 'Chocolate Quente', preco: 7.00, custo: 2.00 },
      { nome: 'Látea', preco: 9.00, custo: 2.50 },
      { nome: 'Suco Natural', preco: 8.00, custo: 2.50 },
      { nome: 'Milkshake', preco: 14.00, custo: 4.50 },
    ],
  },
  'Barbearia': {
    'Cortes': [
      { nome: 'Corte Masculino', preco: 45.00, custo: 2.00 },
      { nome: 'Corte e Barba', preco: 65.00, custo: 3.00 },
      { nome: 'Barba Completa', preco: 35.00, custo: 2.00 },
      { nome: 'Degradê', preco: 50.00, custo: 2.00 },
      { nome: 'Corte Social', preco: 40.00, custo: 2.00 },
      { nome: 'Platinado', preco: 55.00, custo: 5.00 },
      { nome: 'Mechas', preco: 80.00, custo: 12.00 },
      { nome: 'Corte Infantil', preco: 35.00, custo: 2.00 },
    ],
    'Tratamentos': [
      { nome: 'Hidratação Capilar', preco: 40.00, custo: 15.00 },
      { nome: 'Progressiva', preco: 150.00, custo: 45.00 },
      { nome: 'Descoloração', preco: 60.00, custo: 18.00 },
      { nome: 'Pigmentação', preco: 80.00, custo: 25.00 },
      { nome: 'Relaxamento', preco: 120.00, custo: 35.00 },
    ],
    'Sobrancelha e Pele': [
      { nome: 'Sobrancelha Masculina', preco: 15.00, custo: 1.00 },
      { nome: 'Sobrancelha Feminina', preco: 20.00, custo: 1.00 },
      { nome: 'Limpeza de Pele', preco: 50.00, custo: 8.00 },
      { nome: 'Máscara Facial', preco: 35.00, custo: 10.00 },
      { nome: 'Design de Sobrancelha', preco: 30.00, custo: 3.00 },
    ],
    'Produtos': [
      { nome: 'Pomada Modeladora', preco: 35.00, custo: 15.00 },
      { nome: 'Cera para Barba', preco: 28.00, custo: 12.00 },
      { nome: 'Óleo para Barba', preco: 25.00, custo: 10.00 },
      { nome: 'Shampoo Anticaspa', preco: 30.00, custo: 13.00 },
      { nome: 'Condicionador', preco: 28.00, custo: 12.00 },
      { nome: 'Pente de Madeira', preco: 18.00, custo: 6.00 },
    ],
  },
  'Pet Shop': {
    'Banho e Tosa': [
      { nome: 'Banho Pequeno Porte', preco: 50.00, custo: 12.00 },
      { nome: 'Banho Grande Porte', preco: 80.00, custo: 18.00 },
      { nome: 'Tosa Higiênica', preco: 30.00, custo: 8.00 },
      { nome: 'Tosa Completa', preco: 60.00, custo: 15.00 },
      { nome: 'Banho + Tosa PP', preco: 75.00, custo: 20.00 },
      { nome: 'Banho + Tosa GP', preco: 120.00, custo: 30.00 },
      { nome: 'Hidratação de Pelos', preco: 40.00, custo: 15.00 },
      { nome: 'Cortar Unhas', preco: 15.00, custo: 3.00 },
    ],
    'Consultas': [
      { nome: 'Consulta Veterinária', preco: 120.00, custo: 0 },
      { nome: 'Consulta Retorno', preco: 80.00, custo: 0 },
      { nome: 'Vacinação', preco: 60.00, custo: 25.00 },
      { nome: 'Vermifugação', preco: 40.00, custo: 15.00 },
      { nome: 'Exame de Sangue', preco: 90.00, custo: 35.00 },
    ],
    'Rações e Alimentos': [
      { nome: 'Ração Premium 1kg', preco: 25.00, custo: 14.00 },
      { nome: 'Ração Super Premium 1kg', preco: 38.00, custo: 22.00 },
      { nome: 'Ração Premium 8kg', preco: 160.00, custo: 95.00 },
      { nome: 'Petisco Natural', preco: 15.00, custo: 6.00 },
      { nome: 'Osso Natural', preco: 8.00, custo: 3.00 },
      { nome: 'Bifinho', preco: 12.00, custo: 5.00 },
    ],
    'Acessórios': [
      { nome: 'Coleira', preco: 35.00, custo: 14.00 },
      { nome: 'Guia', preco: 25.00, custo: 10.00 },
      { nome: 'Brinquedo', preco: 20.00, custo: 7.00 },
      { nome: 'Cama Pet P', preco: 60.00, custo: 25.00 },
      { nome: 'Cama Pet G', preco: 90.00, custo: 38.00 },
      { nome: 'Comedouro', preco: 18.00, custo: 7.00 },
    ],
  },
  'Loja': {
    'Camisetas': [
      { nome: 'Camiseta Básica', preco: 49.90, custo: 18.00 },
      { nome: 'Camiseta Estampada', preco: 69.90, custo: 25.00 },
      { nome: 'Camisa Social', preco: 89.90, custo: 35.00 },
      { nome: 'Regata', preco: 39.90, custo: 14.00 },
      { nome: 'Moletom', preco: 119.90, custo: 48.00 },
      { nome: 'Blusa de Frio', preco: 79.90, custo: 30.00 },
    ],
    'Calças e Bermudas': [
      { nome: 'Jeans Masculino', preco: 99.90, custo: 42.00 },
      { nome: 'Jeans Feminino', preco: 109.90, custo: 45.00 },
      { nome: 'Bermuda Cargo', preco: 59.90, custo: 22.00 },
      { nome: 'Calça Moletom', preco: 89.90, custo: 35.00 },
      { nome: 'Legging', preco: 49.90, custo: 16.00 },
    ],
    'Calçados': [
      { nome: 'Tênis Casual', preco: 149.90, custo: 60.00 },
      { nome: 'Chinelo', preco: 39.90, custo: 15.00 },
      { nome: 'Sapatênis', preco: 179.90, custo: 72.00 },
      { nome: 'Bota', preco: 199.90, custo: 85.00 },
      { nome: 'Sandália', preco: 69.90, custo: 28.00 },
    ],
    'Acessórios': [
      { nome: 'Boné', preco: 39.90, custo: 15.00 },
      { nome: 'Cinto', preco: 49.90, custo: 18.00 },
      { nome: 'Carteira', preco: 59.90, custo: 22.00 },
      { nome: 'Mochila', preco: 129.90, custo: 50.00 },
      { nome: 'Óculos de Sol', preco: 89.90, custo: 30.00 },
    ],
  },
  'Consultório': {
    'Consultas': [
      { nome: 'Consulta Clínica Geral', preco: 200.00, custo: 0 },
      { nome: 'Consulta Retorno', preco: 150.00, custo: 0 },
      { nome: 'Consulta Particular', preco: 350.00, custo: 0 },
      { nome: 'Teleconsulta', preco: 100.00, custo: 0 },
      { nome: 'Pronto Atendimento', preco: 180.00, custo: 0 },
    ],
    'Exames': [
      { nome: 'Hemograma Completo', preco: 45.00, custo: 20.00 },
      { nome: 'Glicemia em Jejum', preco: 25.00, custo: 10.00 },
      { nome: 'Urina Tipo I', preco: 20.00, custo: 8.00 },
      { nome: 'Colesterol Total', preco: 30.00, custo: 12.00 },
      { nome: 'TSH', preco: 40.00, custo: 18.00 },
      { nome: 'Raio-X Tórax', preco: 80.00, custo: 45.00 },
      { nome: 'Ultrassom Abdômen', preco: 150.00, custo: 70.00 },
      { nome: 'Eletrocardiograma', preco: 90.00, custo: 40.00 },
    ],
    'Procedimentos': [
      { nome: 'Sutura Simples', preco: 80.00, custo: 15.00 },
      { nome: 'Curativo', preco: 30.00, custo: 8.00 },
      { nome: 'Injeção IM', preco: 25.00, custo: 8.00 },
      { nome: 'Inalação', preco: 35.00, custo: 10.00 },
      { nome: 'Nebulização', preco: 40.00, custo: 12.00 },
      { nome: 'Aferição de Pressão', preco: 15.00, custo: 0 },
    ],
  },
  'Oficina': {
    'Serviços Básicos': [
      { nome: 'Troca de Óleo', preco: 80.00, custo: 35.00 },
      { nome: 'Troca de Filtro de Óleo', preco: 30.00, custo: 12.00 },
      { nome: 'Troca de Filtro de Ar', preco: 40.00, custo: 18.00 },
      { nome: 'Alinhamento', preco: 60.00, custo: 15.00 },
      { nome: 'Balanceamento', preco: 50.00, custo: 12.00 },
      { nome: 'Troca de Velas', preco: 120.00, custo: 55.00 },
    ],
    'Freios e Suspensão': [
      { nome: 'Troca de Pastilha Dianteira', preco: 180.00, custo: 75.00 },
      { nome: 'Troca de Disco', preco: 250.00, custo: 110.00 },
      { nome: 'Troca de Amortecedor', preco: 300.00, custo: 130.00 },
      { nome: 'Bleed de Freio', preco: 80.00, custo: 20.00 },
      { nome: 'Troca de Kit Freio Traseiro', preco: 220.00, custo: 90.00 },
    ],
    'Elétrica': [
      { nome: 'Diagnóstico Eletrônico', preco: 100.00, custo: 0 },
      { nome: 'Troca de Bateria', preco: 50.00, custo: 0 },
      { nome: 'Troca de Alternador', preco: 350.00, custo: 180.00 },
      { nome: 'Troca de Motor de Partida', preco: 280.00, custo: 140.00 },
    ],
    'Pneus': [
      { nome: 'Pneu 175/65 R14', preco: 250.00, custo: 150.00 },
      { nome: 'Pneu 185/60 R15', preco: 300.00, custo: 180.00 },
      { nome: 'Troca de Pneu (unid)', preco: 40.00, custo: 5.00 },
      { nome: 'Rodízio de Pneus', preco: 60.00, custo: 10.00 },
      { nome: 'Calibragem', preco: 10.00, custo: 0 },
    ],
    'Produtos': [
      { nome: 'Óleo 5W30 1L', preco: 35.00, custo: 18.00 },
      { nome: 'Óleo 10W40 1L', preco: 30.00, custo: 15.00 },
      { nome: 'Filtro de Óleo', preco: 25.00, custo: 12.00 },
      { nome: 'Fluido de Freio', preco: 40.00, custo: 20.00 },
      { nome: 'Aditivo Radiador', preco: 25.00, custo: 12.00 },
    ],
  },
  'Academia': {
    'Planos': [
      { nome: 'Mensal Individual', preco: 89.90, custo: 0 },
      { nome: 'Trimestral Individual', preco: 229.90, custo: 0 },
      { nome: 'Semestral Individual', preco: 399.90, custo: 0 },
      { nome: 'Anual Individual', preco: 699.90, custo: 0 },
      { nome: 'Mensal Duo', preco: 149.90, custo: 0 },
      { nome: 'Diária (Avulsa)', preco: 30.00, custo: 0 },
    ],
    'Personal': [
      { nome: 'Personal Individual', preco: 120.00, custo: 50.00 },
      { nome: 'Personal Dupla', preco: 80.00, custo: 50.00 },
      { nome: 'Personal Trio', preco: 60.00, custo: 50.00 },
      { nome: 'Avaliação Física', preco: 60.00, custo: 0 },
      { nome: 'Treino Personalizado (mês)', preco: 350.00, custo: 150.00 },
    ],
    'Suplementos': [
      { nome: 'Whey Protein 900g', preco: 119.90, custo: 60.00 },
      { nome: 'Creatina 300g', preco: 69.90, custo: 30.00 },
      { nome: 'BCAA 100 cáps', preco: 49.90, custo: 22.00 },
      { nome: 'Glutamina 300g', preco: 59.90, custo: 28.00 },
      { nome: 'Pré-Treino 300g', preco: 79.90, custo: 35.00 },
      { nome: 'Multivitamínico', preco: 39.90, custo: 18.00 },
      { nome: 'Barra de Proteína', preco: 8.00, custo: 3.50 },
    ],
    'Acessórios': [
      { nome: 'Luva de Treino', preco: 39.90, custo: 15.00 },
      { nome: 'Caneleira', preco: 49.90, custo: 20.00 },
      { nome: 'Corda de Pular', preco: 29.90, custo: 10.00 },
      { nome: 'Garrafa Térmica', preco: 45.00, custo: 20.00 },
      { nome: 'Shaker', preco: 25.00, custo: 10.00 },
      { nome: 'Banda Elástica', preco: 19.90, custo: 6.00 },
    ],
  },
  'Supermercado': {
    'Hortifruti': [
      { nome: 'Banana (kg)', preco: 5.90, custo: 2.80 },
      { nome: 'Maçã (kg)', preco: 8.90, custo: 4.50 },
      { nome: 'Tomate (kg)', preco: 7.90, custo: 3.80 },
      { nome: 'Cebola (kg)', preco: 4.90, custo: 2.20 },
      { nome: 'Batata (kg)', preco: 5.50, custo: 2.50 },
      { nome: 'Alface (unid)', preco: 3.50, custo: 1.50 },
      { nome: 'Cenoura (kg)', preco: 6.90, custo: 3.20 },
      { nome: 'Laranja (kg)', preco: 5.90, custo: 2.80 },
    ],
    'Carnes': [
      { nome: 'Peito de Frango (kg)', preco: 16.90, custo: 12.00 },
      { nome: 'Carne Moída (kg)', preco: 24.90, custo: 17.00 },
      { nome: 'Picanha (kg)', preco: 59.90, custo: 42.00 },
      { nome: 'Alcatra (kg)', preco: 39.90, custo: 28.00 },
      { nome: 'Filé Mignon (kg)', preco: 69.90, custo: 48.00 },
      { nome: 'Tilápia (kg)', preco: 24.90, custo: 14.00 },
    ],
    'Laticínios': [
      { nome: 'Leite Integral 1L', preco: 5.50, custo: 3.80 },
      { nome: 'Queijo Mussarela (kg)', preco: 39.90, custo: 28.00 },
      { nome: 'Manteiga 200g', preco: 9.90, custo: 6.50 },
      { nome: 'Iogurte Natural 170g', preco: 3.50, custo: 2.00 },
      { nome: 'Requeijão 200g', preco: 7.90, custo: 4.80 },
      { nome: 'Presunto (kg)', preco: 32.90, custo: 22.00 },
    ],
    'Limpeza': [
      { nome: 'Detergente 500ml', preco: 2.90, custo: 1.50 },
      { nome: 'Amaciante 2L', preco: 12.90, custo: 7.00 },
      { nome: 'Sabão em Pó 1kg', preco: 9.90, custo: 5.50 },
      { nome: 'Desinfetante 2L', preco: 7.90, custo: 3.80 },
      { nome: 'Esponja (unid)', preco: 2.50, custo: 1.00 },
      { nome: 'Papel Higiênico 12un', preco: 18.90, custo: 11.00 },
    ],
    'Mercearia': [
      { nome: 'Arroz 5kg', preco: 22.90, custo: 16.00 },
      { nome: 'Feijão 1kg', preco: 8.90, custo: 5.50 },
      { nome: 'Açúcar 1kg', preco: 4.90, custo: 3.00 },
      { nome: 'Óleo de Soja 900ml', preco: 7.90, custo: 5.00 },
      { nome: 'Macarrão 500g', preco: 5.50, custo: 3.20 },
      { nome: 'Café 500g', preco: 18.90, custo: 12.00 },
      { nome: 'Farinha de Trigo 1kg', preco: 6.50, custo: 3.80 },
      { nome: 'Sal 1kg', preco: 3.50, custo: 1.80 },
    ],
  },
};

// Fornecedores por segmento
const FORNECEDORES_POR_SEGMENTO: Record<string, string[]> = {
  'Cafeteria': ['Café do Brasil Ltda', 'Frios & Cia', 'Hortifruti Central', 'Bebidas Express', 'Distribuidora Alimentos SA'],
  'Restaurante': ['Carnes Premium', 'Hortifruti Central', 'Distribuidora Alimentos SA', 'Peixes do Mar', 'Bebidas Express'],
  'Padaria': ['Fornecedor de Farinhas SA', 'Frios & Cia', 'Distribuidora Alimentos SA'],
  'Barbearia': ['Distribuidora Cosméticos', 'Barber Pro Ltda'],
  'Pet Shop': ['Pet Food SA', 'Ração Express', 'Veterinária Distribuidora'],
  'Loja': ['Indústria Têxtil SA', 'Distribuidora Calçados', 'Fashion Supply'],
  'Consultório': ['Laboratório Central', 'Distribuidora Farmacêutica', 'Material Médico SA'],
  'Oficina': ['Auto Peças SA', 'Distribuidora Pneus', 'Óleos Lubrificantes Ltda'],
  'Academia': ['Nutricionistas Supply', 'Distribuidora Suplementos', 'EquipFitness Ltda'],
  'Supermercado': ['Distribuidora Alimentos SA', 'Carnes Premium', 'Hortifruti Central', 'Laticínios SA', 'Limpeza Express'],
};

const FORNECEDORES = [
  'Distribuidora Alimentos SA', 'Café do Brasil Ltda', 'Frios & Cia', 
  'Hortifruti Central', 'Carnes Premium', 'Bebidas Express'
];

const CATEGORIAS_CONTAS_PAGAR = ['fornecedores', 'aluguel', 'energia', 'água', 'impostos', 'salários', 'manutenção'];
const CATEGORIAS_CONTAS_RECEBER = ['clientes', 'eventos', 'delivery parceiros'];

// Mapeamento de URLs do menu para features usadas no seed
const SECOES_FEATURE_MAP: Record<string, string> = {
  '/admin/mesas': 'mesas',
  '/admin/delivery': 'delivery',
  '/admin/estoque': 'estoque',
  '/admin/financeiro': 'financeiro',
  '/admin/caixa': 'caixa',
  '/admin/servicos': 'servicos',
  '/admin/produtos': 'produtos',
  '/admin/pedidos': 'pedidos',
  '/admin/funcionarios': 'funcionarios',
  '/admin/relatorios': 'relatorios',
  '/pdv': 'pdv',
  '/pdv-varejo': 'pdv-varejo',
  '/pdv-garcom': 'pdv-garcom',
  '/cardapio': 'cardapio',
};

// Nomes amigáveis das features
const SECOES_NOMES: Record<string, string> = {
  'mesas': 'Mesas',
  'delivery': 'Delivery',
  'estoque': 'Estoque',
  'financeiro': 'Financeiro',
  'caixa': 'Caixa',
  'servicos': 'Serviços',
  'produtos': 'Produtos',
  'pedidos': 'Pedidos',
  'funcionarios': 'Funcionários',
  'relatorios': 'Relatórios',
  'pdv': 'PDV',
  'pdv-varejo': 'PDV Varejo',
  'pdv-garcom': 'PDV Garçon',
  'cardapio': 'Cardápio',
};

// Tipos de venda base
const TIPOS_VENDA_BASE = ['balcao', 'mesa', 'delivery'];

// Formas de pagamento
const FORMAS_PAGAMENTO = ['dinheiro', 'debito', 'credito', 'pix'];

// Tabelas que serão limpas
const TABELAS_PARA_LIMPAR = [
  'categorias',
  'fornecedores',
  'funcionarios',
  'mesas',
  'produtos',
  'vendas',
  'itens_venda',
  'pagamentos',
  'estoque_movimentos',
  'contas',
  'nfe_importadas',
  'caixas',
  'movimentacoes_caixa',
  'logs'
];

export default function SeedPage() {
  return (
    <ProtectedRoute allowedRoles={['master']}>
      <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Seed de Dados' }]}>
        <SeedContent />
      </MainLayout>
    </ProtectedRoute>
  );
}

function SeedContent() {
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [statusList, setStatusList] = useState<SeedStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [numVendas, setNumVendas] = useState(220);

  // Estados do segmento
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [segmentoId, setSegmentoId] = useState<string | null>(null);
  const [segmentoNome, setSegmentoNome] = useState<string | null>(null);
  const [loadingSegmentos, setLoadingSegmentos] = useState(false);
  const [secoesAtivas, setSecoesAtivas] = useState<SecaoAtiva[]>([]);
  const [loadingSecoes, setLoadingSecoes] = useState(false);
  const [limpandoNFe, setLimpandoNFe] = useState(false);
  const [mostrarLogsNFe, setMostrarLogsNFe] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const updateStatus = (step: string, status: SeedStatus['status'], count?: number, message?: string) => {
    setStatusList(prev => {
      const existing = prev.findIndex(s => s.step === step);
      const newItem = { step, status, count, message };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newItem;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  useEffect(() => {
    const buscarEmpresas = async () => {
      try {
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
          .from('empresas')
          .select('id, nome, status')
          .order('nome');
        
        if (error) throw error;
        
        const empresasLista: Empresa[] = (data || []).map(item => ({
          id: item.id,
          nome: item.nome || 'Sem nome',
          status: item.status
        }));

        setEmpresas(empresasLista);
        
        if (empresasLista.length === 0) {
          addLog('Nenhuma empresa cadastrada. Cadastre uma empresa primeiro.');
        } else {
          addLog(`${empresasLista.length} empresa(s) encontrada(s). Selecione uma para continuar.`);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        addLog('Erro ao buscar empresas. Verifique o console.');
      } finally {
        setLoadingEmpresas(false);
      }
    };

    buscarEmpresas();
  }, []);

  const handleEmpresaChange = (value: string) => {
    const empresa = empresas.find(e => e.id === value);
    if (empresa) {
      setEmpresaId(empresa.id);
      setEmpresaNome(empresa.nome);
      setSegmentoId(null);
      setSegmentoNome(null);
      setSecoesAtivas([]);
      addLog(`Empresa selecionada: ${empresa.nome}`);
      carregarSegmentos();
    }
  };

  const carregarSegmentos = async () => {
    setLoadingSegmentos(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('segmentos')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setSegmentos((data || []) as Segmento[]);
      if ((data || []).length > 0) {
        addLog(`${(data || []).length} segmento(s) disponível(is).`);
      }
    } catch (error) {
      console.error('Erro ao buscar segmentos:', error);
      addLog('Erro ao buscar segmentos.');
    } finally {
      setLoadingSegmentos(false);
    }
  };

  const handleSegmentoChange = async (value: string) => {
    if (value === '__all__') {
      setSegmentoId(null);
      setSegmentoNome(null);
      setSecoesAtivas([]);
      addLog('Segmento removido. Todos os dados serão populados.');
      return;
    }
    const seg = segmentos.find(s => s.id === value);
    if (!seg) return;
    setSegmentoId(seg.id);
    setSegmentoNome(seg.nome);
    addLog(`Segmento selecionado: ${seg.nome}`);
    await carregarSecoesAtivas(seg.id);
  };

  const carregarSecoesAtivas = async (segId: string) => {
    setLoadingSecoes(true);
    try {
      const supabase = getSupabaseClient();

      // Buscar seções do segmento
      const { data: secoesRel, error: relError } = await supabase
        .from('segmento_secoes')
        .select('secao_id, ativo')
        .eq('segmento_id', segId);

      if (relError) throw relError;

      // Buscar detalhes das seções do menu
      const secaoIds = (secoesRel || []).map(s => s.secao_id);
      let secoesMenuMap: Record<string, SecaoMenu> = {};

      if (secaoIds.length > 0) {
        const { data: secoesMenu, error: menuError } = await supabase
          .from('secoes_menu')
          .select('id, nome, url')
        if (menuError) throw menuError;
        (secoesMenu || []).forEach((s: any) => {
          secoesMenuMap[s.id] = { id: s.id, nome: s.nome, url: s.url };
        });
      }

      // Mapear para seções ativas
      const resultado: SecaoAtiva[] = [];
      (secoesRel || []).forEach((rel: any) => {
        const menu = secoesMenuMap[rel.secao_id];
        if (menu) {
          const feature = SECOES_FEATURE_MAP[menu.url || ''];
          if (feature && !resultado.find(r => r.secaoId === feature)) {
            resultado.push({
              secaoId: feature,
              secaoNome: SECOES_NOMES[feature] || menu.nome,
              ativo: rel.ativo,
            });
          }
        }
      });

      setSecoesAtivas(resultado);

      const ativas = resultado.filter(r => r.ativo).map(r => r.secaoNome);
      const inativas = resultado.filter(r => !r.ativo).map(r => r.secaoNome);
      if (ativas.length > 0) addLog(`Seções ativas: ${ativas.join(', ')}`);
      if (inativas.length > 0) addLog(`Seções desabilitadas: ${inativas.join(', ')}`);
    } catch (error) {
      console.error('Erro ao carregar seções:', error);
      addLog('Erro ao carregar seções do segmento.');
    } finally {
      setLoadingSecoes(false);
    }
  };

  // Verifica se uma funcionalidade está habilitada
  const isFeatureAtiva = (feature: string): boolean => {
    if (!segmentoId || secoesAtivas.length === 0) return true; // Se não selecionou segmento, tudo habilitado
    const secao = secoesAtivas.find(s => s.secaoId === feature);
    return secao ? secao.ativo : true; // Se não encontrou, assume ativa
  };

  const gerarPIN = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  // Gera datas aleatórias entre dataInicio e dataFim
  const gerarDataAleatoria = (dtInicio: Date, dtFim: Date) => {
    const inicio = new Date(dtInicio);
    inicio.setHours(7, 0, 0, 0);
    const fim = new Date(dtFim);
    fim.setHours(23, 59, 59, 999);
    
    if (fim.getTime() <= inicio.getTime()) {
      return inicio;
    }
    
    const diferencaMs = fim.getTime() - inicio.getTime();
    const randomMs = Math.floor(Math.random() * diferencaMs);
    
    const data = new Date(inicio.getTime() + randomMs);
    data.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60), 0, 0);
    return data;
  };

  // Função para limpar tabela por empresa_id
  const limparTabela = async (supabase: ReturnType<typeof getSupabaseClient>, nomeTabela: string, empresaId: string): Promise<number> => {
    const { data, error } = await supabase
      .from(nomeTabela)
      .delete()
      .eq('empresa_id', empresaId)
      .select('id');
    
    if (error) {
      console.error(`Erro ao limpar ${nomeTabela}:`, error);
      return 0;
    }
    
    return data?.length || 0;
  };

  const limparImportacoesNFe = async () => {
    if (!empresaId) {
      addLog('Erro: Selecione uma empresa!');
      return;
    }

    setLimpandoNFe(true);
    setMostrarLogsNFe(true);
    setLogs([]);
    addLog('🧹 Limpando histórico de importações NFe...');

    const supabase = getSupabaseClient();

    try {
      // 1. Deletar nfe_importadas — ON DELETE CASCADE remove estoque_movimentos e contas vinculados
      const { data: nfeDeletadas, error: errNfe } = await supabase
        .from('nfe_importadas')
        .delete()
        .eq('empresa_id', empresaId)
        .select('id');
      if (errNfe) throw errNfe;
      const countNfe = nfeDeletadas?.length || 0;
      addLog(`  - nfe_importadas: ${countNfe} registro(s) removido(s)`);

      // 2. Deletar fornecedores criados por importação NFe
      const { data: fornDeletados, error: errForn } = await supabase
        .from('fornecedores')
        .delete()
        .eq('empresa_id', empresaId)
        .select('id');
      if (errForn) throw errForn;
      const countForn = fornDeletados?.length || 0;
      addLog(`  - fornecedores: ${countForn} registro(s) removido(s)`);

      const total = countNfe + countForn;
      if (total > 0) {
        addLog(`✅ ${total} registro(s) de importação NFe removido(s).`);
      } else {
        addLog('✅ Nenhum registro de importação NFe encontrado.');
      }
    } catch (err: any) {
      addLog(`❌ Erro ao limpar importações NFe: ${err.message}`);
      console.error('Erro limpar NFe:', err);
    } finally {
      setLimpandoNFe(false);
    }
  };

  const executarSeed = async () => {
    if (!empresaId) {
      addLog('Erro: Selecione uma empresa!');
      return;
    }

    setLoading(true);
    setMostrarLogsNFe(false);
    setProgress(0);
    setLogs([]);
    setStatusList([]);

    // Determinar seções ativas
    const criarMesas = isFeatureAtiva('mesas');
    const incluirDelivery = isFeatureAtiva('delivery');
    const criarEstoque = isFeatureAtiva('estoque');
    const criarFinanceiro = isFeatureAtiva('financeiro');
    const criarCaixas = isFeatureAtiva('caixa');
    const tiposVenda = incluirDelivery ? TIPOS_VENDA_BASE : TIPOS_VENDA_BASE.filter(t => t !== 'delivery');

    const supabase = getSupabaseClient();

    let totalProgress = 0;
    const setProgressValue = (value: number) => {
      totalProgress = value;
      setProgress(value);
    };

    try {
      // Converter datas do período
      const periodoInicio = new Date(dataInicio + 'T00:00:00');
      const periodoFim = new Date(dataFim + 'T23:59:59');
      addLog(`📅 Período selecionado: ${dataInicio} a ${dataFim}`);

      // ==========================================
      // 0. LIMPAR DADOS EXISTENTES
      // ==========================================
      updateStatus('Limpando dados antigos', 'running');
      addLog('🧹 Limpando dados existentes da empresa...');

      let totalDeletados = 0;
      for (const tabela of TABELAS_PARA_LIMPAR) {
        try {
          const deletados = await limparTabela(supabase, tabela, empresaId);
          if (deletados > 0) {
            addLog(`  - ${tabela}: ${deletados} registro(s) removido(s)`);
          }
          totalDeletados += deletados;
        } catch (err) {
          addLog(`  - ${tabela}: erro ao limpar (pode estar vazia)`);
        }
      }

      updateStatus('Limpando dados antigos', 'done', totalDeletados);
      setProgressValue(5);
      addLog(`✅ ${totalDeletados} registros antigos removidos.`);
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog('📦 Iniciando criação de novos dados...');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Selecionar catálogo de produtos e fornecedores baseado no segmento
      const catalogoProdutos = PRODUTOS_POR_SEGMENTO[segmentoNome || 'Cafeteria'] || PRODUTOS_POR_SEGMENTO['Cafeteria'];
      const fornecedoresSeed = FORNECEDORES_POR_SEGMENTO[segmentoNome || 'Cafeteria'] || FORNECEDORES;
      if (segmentoNome) {
        addLog(`📋 Segmento: ${segmentoNome}`);
      }

      // ==========================================
      // 1. CRIAR CATEGORIAS
      // ==========================================
      updateStatus('Categorias', 'running');
      addLog('Criando categorias...');
      
      const categoriasMap: Record<string, string> = {};
      const categoriasData: {empresa_id: string, nome: string, cor: string, ordem: number, ativo: boolean, criado_em: string, atualizado_em: string}[] = [];
      
      let corIndex = 0;
      for (const [nomeCategoria] of Object.entries(catalogoProdutos)) {
        categoriasData.push({
          empresa_id: empresaId,
          nome: nomeCategoria,
          cor: CORES_CATEGORIAS[corIndex % CORES_CATEGORIAS.length],
          ordem: corIndex + 1,
          ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        });
        corIndex++;
      }

      const { data: categoriasInsert, error: catError } = await supabase
        .from('categorias')
        .insert(categoriasData)
        .select('id, nome');

      if (catError) throw catError;
      
      categoriasInsert?.forEach(cat => {
        categoriasMap[cat.nome] = cat.id;
      });
      
      updateStatus('Categorias', 'done', Object.keys(categoriasMap).length);
      setProgressValue(10);
      addLog(`${Object.keys(categoriasMap).length} categorias criadas.`);

      // ==========================================
      // 2. CRIAR FUNCIONÁRIOS
      // ==========================================
      updateStatus('Funcionários', 'running');
      addLog('Criando funcionários...');

      const funcionariosData = NOMES_FUNCIONARIOS.map((nome, i) => ({
        empresa_id: empresaId,
        nome: nome,
        cargo: CARGOS[i % CARGOS.length],
        email: `${nome.toLowerCase().replace(' ', '.')}@email.com`,
        telefone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        pin: gerarPIN(),
        perm_pdv: true,
        perm_estoque: i < 3,
        perm_financeiro: i < 2,
        perm_relatorios: i < 2,
        perm_cancelar_venda: i < 3,
        perm_dar_desconto: i < 3,
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }));

      const { data: funcionariosInsert, error: funcError } = await supabase
        .from('funcionarios')
        .insert(funcionariosData)
        .select('id');

      if (funcError) throw funcError;
      
      const funcionariosIds = funcionariosInsert?.map(f => f.id) || [];

      updateStatus('Funcionários', 'done', funcionariosIds.length);
      setProgressValue(15);
      addLog(`${funcionariosIds.length} funcionários criados.`);

      // ==========================================
      // 3. CRIAR MESAS
      // ==========================================
      let mesasIds: string[] = [];
      if (criarMesas) {
        updateStatus('Mesas', 'running');
        addLog('Criando mesas...');

        const mesasData = Array.from({ length: 15 }, (_, i) => ({
          empresa_id: empresaId,
          numero: i + 1,
          capacidade: i < 5 ? 2 : i < 10 ? 4 : 6,
          status: 'livre',
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }));

        const { data: mesasInsert, error: mesasError } = await supabase
          .from('mesas')
          .insert(mesasData)
          .select('id');

        if (mesasError) throw mesasError;
        mesasIds = mesasInsert?.map(m => m.id) || [];

        updateStatus('Mesas', 'done', mesasIds.length);
        addLog(`${mesasIds.length} mesas criadas.`);
      } else {
        updateStatus('Mesas', 'done', 0, 'Desabilitada no segmento');
        addLog('⏭️ Mesas: desabilitada no segmento selecionado.');
      }
      setProgressValue(20);

      // ==========================================
      // 4. CRIAR PRODUTOS
      // ==========================================
      updateStatus('Produtos', 'running');
      addLog('Criando produtos...');

      const produtosIds: string[] = [];
      const produtosDataInsert: {empresa_id: string, categoria_id: string, nome: string, descricao: string, codigo: string, preco: number, custo: number, unidade: string, estoque_atual: number, estoque_minimo: number, controlar_estoque: boolean, destaque: boolean, ativo: boolean, criado_em: string, atualizado_em: string}[] = [];
      const produtosDataInfo: {id: string, nome: string, preco: number, custo: number}[] = [];

      for (const [nomeCategoria, produtos] of Object.entries(catalogoProdutos)) {
        const categoriaId = categoriasMap[nomeCategoria];
        
        for (const produto of produtos) {
          produtosDataInsert.push({
            empresa_id: empresaId,
            categoria_id: categoriaId,
            nome: produto.nome,
            descricao: `${produto.nome} - produto de qualidade`,
            codigo: `PROD${String(produtosIds.length + 1).padStart(4, '0')}`,
            preco: produto.preco,
            custo: produto.custo,
            unidade: 'un',
            estoque_atual: produtosIds.length % 5 === 0
              ? Math.floor(Math.random() * 5)
              : Math.floor(50 + Math.random() * 150),
            estoque_minimo: Math.floor(5 + Math.random() * 25),
            controlar_estoque: true,
            destaque: Math.random() > 0.7,
            ativo: true,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          });
          produtosIds.push('temp');
        }
      }

      const { data: produtosInsert, error: prodError } = await supabase
        .from('produtos')
        .insert(produtosDataInsert)
        .select('id, nome, preco, custo');

      if (prodError) throw prodError;
      
      produtosInsert?.forEach(p => {
        produtosDataInfo.push({ id: p.id, nome: p.nome, preco: p.preco, custo: p.custo });
      });

      updateStatus('Produtos', 'done', produtosDataInfo.length);
      setProgressValue(25);
      addLog(`${produtosDataInfo.length} produtos criados.`);

      // ==========================================
      // 5. CRIAR VENDAS (220 vendas)
      // ==========================================
      updateStatus('Vendas', 'running');
      addLog('Criando vendas (isso pode levar alguns segundos)...');

      const vendasIds: string[] = [];
      const vendasSeedInfo: {id: string, total: number, forma_pagamento: string, criado_em: number}[] = [];
      const NUM_VENDAS = Number(numVendas) || 220;
      const itensVendaData: {empresa_id: string, venda_id: string, produto_id: string, nome: string, quantidade: number, preco_unitario: number, total: number, criado_em: string}[] = [];
      const pagamentosData: {empresa_id: string, venda_id: string, forma_pagamento: string, valor: number, criado_em: string}[] = [];

      for (let i = 0; i < NUM_VENDAS; i++) {
        const dataVenda = gerarDataAleatoria(periodoInicio, periodoFim);
        const tipoVenda = tiposVenda[Math.floor(Math.random() * tiposVenda.length)];
        const formaPagamento = FORMAS_PAGAMENTO[Math.floor(Math.random() * FORMAS_PAGAMENTO.length)];
        const funcionarioIdx = Math.floor(Math.random() * funcionariosIds.length);
        const funcionarioId = funcionariosIds[funcionarioIdx];
        const funcionarioNome = NOMES_FUNCIONARIOS[funcionarioIdx % NOMES_FUNCIONARIOS.length];
        
        const numItens = Math.floor(Math.random() * 5) + 1;
        let subtotal = 0;
        const itensVenda: {produtoId: string, quantidade: number, precoUnitario: number}[] = [];

        for (let j = 0; j < numItens; j++) {
          const produtoIdx = Math.floor(Math.random() * produtosDataInfo.length);
          const produto = produtosDataInfo[produtoIdx];
          const quantidade = Math.floor(Math.random() * 3) + 1;
          itensVenda.push({
            produtoId: produto.id,
            quantidade,
            precoUnitario: produto.preco
          });
          subtotal += produto.preco * quantidade;
        }

        const desconto = Math.random() > 0.8 ? Math.floor(subtotal * (Math.random() * 0.1)) : 0;
        const taxaServico = tipoVenda === 'mesa' ? Math.floor(subtotal * 0.1) : 0;
        const total = subtotal - desconto + taxaServico;

        const mesaId = tipoVenda === 'mesa' && mesasIds.length > 0 
          ? mesasIds[Math.floor(Math.random() * mesasIds.length)] 
          : null;

        const vendaData = {
          empresa_id: empresaId,
          mesa_id: mesaId,
          funcionario_id: funcionarioId,
          tipo: tipoVenda,
          canal: tipoVenda === 'delivery' ? 'delivery' : tipoVenda === 'mesa' ? 'mesa' : 'balcao',
          status: 'fechada',
          subtotal,
          desconto,
          taxa_servico: taxaServico,
          total,
          forma_pagamento: formaPagamento,
          criado_por: funcionarioId,
          criado_por_nome: funcionarioNome,
          observacao: Math.random() > 0.7 ? 'Sem observações' : '',
          criado_em: dataVenda.toISOString(),
          atualizado_em: dataVenda.toISOString(),
          fechado_em: dataVenda.toISOString()
        };

        const { data: vendaInsert, error: vendaError } = await supabase
          .from('vendas')
          .insert(vendaData)
          .select('id')
          .single();

        if (vendaError) throw vendaError;
        
        if (vendaInsert) {
          vendasIds.push(vendaInsert.id);
          
          // Guardar info da venda para vincular ao caixa depois
          vendasSeedInfo.push({
            id: vendaInsert.id,
            total,
            forma_pagamento: formaPagamento,
            criado_em: dataVenda.getTime(),
          });
          
          for (const item of itensVenda) {
            const produtoInfo = produtosDataInfo.find(p => p.id === item.produtoId);
            itensVendaData.push({
              empresa_id: empresaId,
              venda_id: vendaInsert.id,
              produto_id: item.produtoId,
              nome: produtoInfo?.nome || '',
              quantidade: item.quantidade,
              preco_unitario: item.precoUnitario,
              total: item.precoUnitario * item.quantidade,
              criado_em: dataVenda.toISOString()
            });
          }

          pagamentosData.push({
            empresa_id: empresaId,
            venda_id: vendaInsert.id,
            forma_pagamento: formaPagamento,
            valor: total,
            criado_em: dataVenda.toISOString()
          });
        }

        if (i % 20 === 0) {
          setProgressValue(25 + Math.floor((i / NUM_VENDAS) * 50));
        }
      }

      // Inserir itens de venda em batch
      if (itensVendaData.length > 0) {
        const { error: itensError } = await supabase
          .from('itens_venda')
          .insert(itensVendaData);
        if (itensError) console.error('Erro ao inserir itens:', itensError);
      }

      // Inserir pagamentos em batch
      if (pagamentosData.length > 0) {
        const { error: pgError } = await supabase
          .from('pagamentos')
          .insert(pagamentosData);
        if (pgError) console.error('Erro ao inserir pagamentos:', pgError);
      }

      updateStatus('Vendas', 'done', NUM_VENDAS);
      setProgressValue(75);
      addLog(`${NUM_VENDAS} vendas criadas com seus itens e pagamentos.`);

      // ==========================================
      // 6. CRIAR MOVIMENTOS DE ESTOQUE
      // ==========================================
      let numMovimentos = 0;
      if (criarEstoque) {
        updateStatus('Movimentos de Estoque', 'running');
        addLog('Criando movimentos de estoque...');

        const NUM_MOVIMENTOS = 100;
        const movimentosData = Array.from({ length: NUM_MOVIMENTOS }, () => {
          const produto = produtosDataInfo[Math.floor(Math.random() * produtosDataInfo.length)];
          const tipo = ['entrada', 'saida', 'ajuste'][Math.floor(Math.random() * 3)] as 'entrada' | 'saida' | 'ajuste';
          const quantidade = tipo === 'entrada' 
            ? Math.floor(Math.random() * 50) + 10 
            : tipo === 'saida'
            ? -(Math.floor(Math.random() * 20) + 1)
            : Math.floor(Math.random() * 30) - 15;

          return {
            empresa_id: empresaId,
            produto_id: produto.id,
            tipo,
            quantidade,
            preco_unitario: produto.custo,
            observacao: tipo === 'entrada' ? 'Reposição de estoque' : tipo === 'saida' ? 'Saída manual' : 'Ajuste de inventário',
            usuario_id: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
            criado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
          };
        });

        const { error: movError } = await supabase
          .from('estoque_movimentos')
          .insert(movimentosData);

        if (movError) console.error('Erro ao criar movimentos:', movError);

        updateStatus('Movimentos de Estoque', 'done', NUM_MOVIMENTOS);
        setProgressValue(80);
        addLog(`${NUM_MOVIMENTOS} movimentos de estoque criados.`);
        numMovimentos = NUM_MOVIMENTOS;
      } else {
        updateStatus('Movimentos de Estoque', 'done', 0, 'Desabilitada no segmento');
        addLog('⏭️ Movimentos de estoque: desabilitada no segmento selecionado.');
        setProgressValue(80);
      }

      // ==========================================
      // 7. CRIAR CONTAS A PAGAR/RECEBER
      // ==========================================
      if (criarFinanceiro) {
        updateStatus('Contas a Pagar/Receber', 'running');
        addLog('Criando contas a pagar e receber...');

        const contasData: {empresa_id: string, tipo: string, descricao: string, valor: number, vencimento: string, categoria: string, fornecedor?: string, status: string, data_pagamento?: string, valor_pago?: number, forma_pagamento?: string, criado_em: string, atualizado_em: string}[] = [];

        for (let i = 0; i < 25; i++) {
          const vencimento = gerarDataAleatoria(periodoInicio, periodoFim);
          const status = Math.random() > 0.4 ? 'pago' : 'pendente';

          contasData.push({
            empresa_id: empresaId,
            tipo: 'pagar',
            descricao: `${CATEGORIAS_CONTAS_PAGAR[Math.floor(Math.random() * CATEGORIAS_CONTAS_PAGAR.length)]} - ${fornecedoresSeed[Math.floor(Math.random() * fornecedoresSeed.length)]}`,
            valor: Math.floor(Math.random() * 3000) + 200,
            vencimento: vencimento.toISOString(),
            categoria: CATEGORIAS_CONTAS_PAGAR[Math.floor(Math.random() * CATEGORIAS_CONTAS_PAGAR.length)],
            fornecedor: fornecedoresSeed[Math.floor(Math.random() * fornecedoresSeed.length)],
            status,
            data_pagamento: status === 'pago' ? new Date(vencimento.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            valor_pago: status === 'pago' ? Math.floor(Math.random() * 3000) + 200 : undefined,
            forma_pagamento: status === 'pago' ? 'pix' : undefined,
            criado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString(),
            atualizado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
          });
        }

        for (let i = 0; i < 15; i++) {
          const vencimento = gerarDataAleatoria(periodoInicio, periodoFim);
          const status = Math.random() > 0.4 ? 'pago' : 'pendente';

          contasData.push({
            empresa_id: empresaId,
            tipo: 'receber',
            descricao: `Recebimento - ${CATEGORIAS_CONTAS_RECEBER[Math.floor(Math.random() * CATEGORIAS_CONTAS_RECEBER.length)]}`,
            valor: Math.floor(Math.random() * 5000) + 500,
            vencimento: vencimento.toISOString(),
            categoria: CATEGORIAS_CONTAS_RECEBER[Math.floor(Math.random() * CATEGORIAS_CONTAS_RECEBER.length)],
            status,
            data_pagamento: status === 'pago' ? vencimento.toISOString() : undefined,
            valor_pago: status === 'pago' ? Math.floor(Math.random() * 5000) + 500 : undefined,
            forma_pagamento: status === 'pago' ? 'pix' : undefined,
            criado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString(),
            atualizado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
          });
        }

        const { error: contasError } = await supabase
          .from('contas')
          .insert(contasData);

        if (contasError) console.error('Erro ao criar contas:', contasError);

        updateStatus('Contas a Pagar/Receber', 'done', 40);
        setProgressValue(85);
        addLog('40 contas (pagar/receber) criadas.');
      } else {
        updateStatus('Contas a Pagar/Receber', 'done', 0, 'Desabilitada no segmento');
        addLog('⏭️ Contas a pagar/receber: desabilitada no segmento selecionado.');
        setProgressValue(85);
      }

      // ==========================================
      // 8. CRIAR CAIXAS
      // ==========================================
      if (criarCaixas) {
        updateStatus('Caixas', 'running');
        addLog('Criando sessões de caixa...');

      const caixasData: {empresa_id: string, valor_inicial: number, valor_atual: number, total_entradas: number, total_saidas: number, total_vendas: number, status: string, aberto_por: string, aberto_por_nome: string, aberto_em: string, fechado_por?: string, fechado_por_nome?: string, fechado_em?: string, valor_final?: number, quebra?: number, observacao_abertura: string, observacao_fechamento: string}[] = [];
      const movimentacoesCaixaData: {caixa_id: string, empresa_id: string, venda_id?: string, tipo: string, valor: number, forma_pagamento: string, descricao: string, usuario_id: string, usuario_nome: string, criado_em: string}[] = [];

      for (let i = 0; i < 20; i++) {
        const dataAbertura = gerarDataAleatoria(periodoInicio, periodoFim);
        const dataFechamento = new Date(dataAbertura.getTime() + 8 * 60 * 60 * 1000);
        const valorInicial = Math.floor(Math.random() * 300) + 100;
        const totalVendas = Math.floor(Math.random() * 3000) + 500;
        const totalEntradas = totalVendas + Math.floor(Math.random() * 200);
        const totalSaidas = Math.floor(Math.random() * 100);
        const valorFinal = valorInicial + totalEntradas - totalSaidas;

        const caixaItem = {
          empresa_id: empresaId,
          valor_inicial: valorInicial,
          valor_atual: valorFinal,
          total_entradas: totalEntradas,
          total_saidas: totalSaidas,
          total_vendas: totalVendas,
          status: i < 18 ? 'fechado' : 'aberto',
          aberto_por: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
          aberto_por_nome: NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)],
          aberto_em: dataAbertura.toISOString(),
          fechado_por: i < 18 ? funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)] : undefined,
          fechado_por_nome: i < 18 ? NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)] : undefined,
          fechado_em: i < 18 ? dataFechamento.toISOString() : undefined,
          valor_final: i < 18 ? valorFinal : undefined,
          quebra: i < 18 ? Math.floor(Math.random() * 20) - 10 : undefined,
          observacao_abertura: '',
          observacao_fechamento: ''
        };
        caixasData.push(caixaItem);
      }

      const { data: caixasInsert, error: caixasError } = await supabase
        .from('caixas')
        .insert(caixasData)
        .select('id, aberto_em');

      if (caixasError) console.error('Erro ao criar caixas:', caixasError);

      // Criar movimentações de caixa (abertura, vendas e fechamento)
      // Primeiro, associar vendas aos caixas baseado na data
      caixasInsert?.forEach((caixa, i) => {
        const dataAbertura = new Date(caixa.aberto_em || new Date());
        const dataFechamento = caixasData[i].status === 'fechado'
          ? new Date(caixasData[i].fechado_em || dataAbertura.getTime() + 8 * 60 * 60 * 1000)
          : new Date();

        movimentacoesCaixaData.push({
          caixa_id: caixa.id,
          empresa_id: empresaId,
          tipo: 'abertura',
          valor: caixasData[i].valor_inicial,
          forma_pagamento: 'dinheiro',
          descricao: 'Abertura de caixa',
          usuario_id: funcionariosIds[0],
          usuario_nome: NOMES_FUNCIONARIOS[0],
          criado_em: dataAbertura.toISOString()
        });

        // Vincular vendas a este caixa como movimentações tipo 'venda'
        // Buscar vendas cuja data está no período deste caixa
        const vendasDoCaixa = vendasSeedInfo.filter(v =>
          v.criado_em >= dataAbertura.getTime() && v.criado_em <= dataFechamento.getTime()
        );

        vendasDoCaixa.forEach(venda => {
          movimentacoesCaixaData.push({
            caixa_id: caixa.id,
            empresa_id: empresaId,
            tipo: 'venda',
            valor: venda.total,
            forma_pagamento: venda.forma_pagamento,
            descricao: `Venda - ${venda.forma_pagamento}`,
            venda_id: venda.id,
            usuario_id: funcionariosIds[0],
            usuario_nome: NOMES_FUNCIONARIOS[0],
            criado_em: new Date(venda.criado_em).toISOString()
          });
        });

        if (caixasData[i].status === 'fechado') {
          movimentacoesCaixaData.push({
            caixa_id: caixa.id,
            empresa_id: empresaId,
            tipo: 'fechamento',
            valor: caixasData[i].valor_final || 0,
            forma_pagamento: 'dinheiro',
            descricao: 'Fechamento de caixa',
            usuario_id: funcionariosIds[0],
            usuario_nome: NOMES_FUNCIONARIOS[0],
            criado_em: dataFechamento.toISOString()
          });
        }
      });

      if (movimentacoesCaixaData.length > 0) {
        const { error: movCaixaError } = await supabase
          .from('movimentacoes_caixa')
          .insert(movimentacoesCaixaData);
        if (movCaixaError) console.error('Erro ao criar movimentações de caixa:', movCaixaError);
      }

      updateStatus('Caixas', 'done', 20);
      setProgressValue(95);
      addLog('20 sessões de caixa criadas com suas movimentações.');
      } else {
        updateStatus('Caixas', 'done', 0, 'Desabilitada no segmento');
        addLog('⏭️ Sessões de caixa: desabilitada no segmento selecionado.');
        setProgressValue(95);
      }

      // ==========================================
      // 9. CRIAR LOGS
      // ==========================================
      updateStatus('Logs de Atividade', 'running');
      addLog('Criando logs de atividade...');

      const acoes = [
        'VENDA_FINALIZADA', 'PRODUTO_CADASTRADO', 'ESTOQUE_ATUALIZADO', 
        'CAIXA_ABERTO', 'CAIXA_FECHADO', 'FUNCIONARIO_CADASTRADO',
        'CONTA_PAGA', 'RELATORIO_GERADO', 'LOGIN_REALIZADO'
      ];

      const logsData = Array.from({ length: 100 }, () => ({
        empresa_id: empresaId,
        usuario_id: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
        usuario_nome: NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)],
        acao: acoes[Math.floor(Math.random() * acoes.length)],
        detalhes: 'Ação realizada automaticamente via seed',
        tipo: ['venda', 'produto', 'estoque', 'funcionario', 'financeiro', 'outro'][Math.floor(Math.random() * 6)],
        data_hora: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
      }));

      const { error: logsError } = await supabase
        .from('logs')
        .insert(logsData);

      if (logsError) console.error('Erro ao criar logs:', logsError);

      updateStatus('Logs de Atividade', 'done', 100);
      setProgressValue(100);
      addLog('100 logs de atividade criados.');

      // FINALIZADO
      addLog('═══════════════════════════════════════');
      addLog('✅ SEED CONCLUÍDO COM SUCESSO!');
      addLog('═══════════════════════════════════════');
      addLog(`Total de registros criados: ${8 + funcionariosIds.length + mesasIds.length + produtosDataInfo.length + NUM_VENDAS * 3 + numMovimentos + 40 + 20 * 2 + 100}`);

    } catch (error) {
      console.error('Erro no seed:', error);
      addLog(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: SeedStatus['status']) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Seed de Dados</h1>
          <p className="text-muted-foreground mt-1">População de dados de teste</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            População de Dados de Teste
          </CardTitle>
          <CardDescription>
            Gera dados fictícios para testes e desenvolvimento de relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso importante */}
          <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">⚠️ Atenção</p>
              <p className="text-sm text-amber-700">
                Este processo irá <strong>excluir todos os dados existentes</strong> da empresa selecionada e criar novos dados de teste.
              </p>
            </div>
          </div>

          {/* Seletor de empresa */}
          <div className="space-y-2">
            <Label htmlFor="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Selecione a Empresa
            </Label>
            {loadingEmpresas ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando empresas...</span>
              </div>
            ) : empresas.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Nenhuma empresa cadastrada</p>
                  <p className="text-sm text-red-600">Cadastre uma empresa antes de executar o seed.</p>
                </div>
              </div>
            ) : (
              <Select value={empresaId || ''} onValueChange={handleEmpresaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                      {empresa.status && empresa.status !== 'ativo' && (
                        <span className="ml-2 text-xs text-muted-foreground">({empresa.status})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Período de dados */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Período dos Dados
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dataInicio" className="text-sm text-muted-foreground">Data Início</Label>
                <input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataFim" className="text-sm text-muted-foreground">Data Fim</Label>
                <input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            {dataInicio && dataFim && new Date(dataFim) <= new Date(dataInicio) && (
              <p className="text-sm text-red-500">A data fim deve ser posterior à data início.</p>
            )}
          </div>

          {/* Número de lançamentos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Número de Lançamentos (vendas)
            </Label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={numVendas}
                onChange={(e) => setNumVendas(Number(e.target.value))}
                disabled={loading}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <span className="text-lg font-bold text-orange-600 min-w-[4rem] text-right">{numVendas}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>500</span>
              <span>1000</span>
            </div>
          </div>

          {/* Status da empresa selecionada */}
          {empresaId && (
            <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Empresa selecionada</p>
                <p className="text-sm text-green-600">{empresaNome} (ID: {empresaId.substring(0, 8)}...)</p>
              </div>
            </div>
          )}

          {/* Seletor de segmento */}
          {empresaId && (
            <div className="space-y-2">
              <Label htmlFor="segmento" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Segmento (opcional)
              </Label>
              {loadingSegmentos ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando segmentos...</span>
                </div>
              ) : segmentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum segmento ativo encontrado.</p>
              ) : (
                <Select value={segmentoId || '__all__'} onValueChange={handleSegmentoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os dados (sem filtro de segmento)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      Todos os dados (sem filtro de segmento)
                    </SelectItem>
                    {segmentos.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id}>
                        {seg.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Resumo de seções baseado no segmento */}
          {loadingSecoes && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">Carregando seções do segmento...</span>
            </div>
          )}
          {segmentoId && secoesAtivas.length > 0 && !loadingSecoes && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
              <p className="text-sm font-semibold text-blue-800">📋 As seguintes seções serão populadas:</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-700 border-green-300">✅ Categorias</Badge>
                <Badge className="bg-green-100 text-green-700 border-green-300">✅ Produtos</Badge>
                <Badge className="bg-green-100 text-green-700 border-green-300">✅ Funcionários</Badge>
                <Badge className="bg-green-100 text-green-700 border-green-300">✅ Vendas</Badge>
                <Badge className="bg-green-100 text-green-700 border-green-300">✅ Logs</Badge>
                {secoesAtivas.map((s) => (
                  <Badge
                    key={s.secaoId}
                    className={s.ativo
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                    }
                  >
                    {s.ativo ? '✅' : '❌'} {s.secaoNome}{!s.ativo ? ' (desabilitada)' : ''}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Progresso */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Status de cada etapa */}
          {statusList.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Status das Etapas</h3>
              <div className="grid gap-2">
                {statusList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.step}</span>
                    </div>
                    {item.count !== undefined && (
                      <Badge variant="outline">{item.count} registros</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão de executar */}
          <Button
            onClick={executarSeed}
            disabled={loading || !empresaId || empresas.length === 0 || !dataInicio || !dataFim || new Date(dataFim) <= new Date(dataInicio)}
            className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Executando Seed...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-5 w-5" />
                Limpar e Popular Dados
              </>
            )}
          </Button>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Log de Execução</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className={log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : log.includes('🧹') ? 'text-yellow-400' : log.includes('📦') ? 'text-blue-400' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: Limpeza de Importações NFe */}
      <Card className="mb-6 border-red-200 dark:border-red-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-red-500" />
            Limpeza de Importações NFe
          </CardTitle>
          <CardDescription>
            Remove apenas registros de notas fiscais importadas, seus fornecedores e vínculos (estoque e contas). 
            Não afeta os demais dados da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">
              Os produtos criados pela importação <strong>não serão removidos</strong>. 
              Para limpar todos os dados, use o seed completo acima.
            </p>
          </div>
          <Button
            onClick={limparImportacoesNFe}
            disabled={limpandoNFe || !empresaId}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            {limpandoNFe ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Limpando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Histórico de NFe Importadas
              </>
            )}
          </Button>
          {/* Logs específicos da limpeza NFe */}
          {mostrarLogsNFe && logs.length > 0 && (
            <div className="mt-3 bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm max-h-40 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className={log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : log.includes('🧹') ? 'text-yellow-400' : ''}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do que será criado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            O que será criado
            {segmentoId && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">(filtrado pelo segmento)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">8</p>
              <p className="text-sm text-blue-700">Categorias</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">8</p>
              <p className="text-sm text-purple-700">Funcionários</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isFeatureAtiva('mesas') ? 'bg-orange-50' : 'bg-gray-100 opacity-50'}`}>
              <p className={`text-2xl font-bold ${isFeatureAtiva('mesas') ? 'text-orange-600' : 'text-gray-400'}`}>
                {isFeatureAtiva('mesas') ? '15' : '—'}
              </p>
              <p className={`text-sm ${isFeatureAtiva('mesas') ? 'text-orange-700' : 'text-gray-400 line-through'}`}>
                Mesas{!isFeatureAtiva('mesas') && segmentoId ? ' (desabilitada)' : ''}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">~50</p>
              <p className="text-sm text-green-700">Produtos</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{numVendas}</p>
              <p className="text-sm text-red-700">Vendas</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isFeatureAtiva('estoque') ? 'bg-cyan-50' : 'bg-gray-100 opacity-50'}`}>
              <p className={`text-2xl font-bold ${isFeatureAtiva('estoque') ? 'text-cyan-600' : 'text-gray-400'}`}>
                {isFeatureAtiva('estoque') ? '100' : '—'}
              </p>
              <p className={`text-sm ${isFeatureAtiva('estoque') ? 'text-cyan-700' : 'text-gray-400 line-through'}`}>
                Mov. Estoque{!isFeatureAtiva('estoque') && segmentoId ? ' (desabilitada)' : ''}
              </p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isFeatureAtiva('financeiro') ? 'bg-pink-50' : 'bg-gray-100 opacity-50'}`}>
              <p className={`text-2xl font-bold ${isFeatureAtiva('financeiro') ? 'text-pink-600' : 'text-gray-400'}`}>
                {isFeatureAtiva('financeiro') ? '40' : '—'}
              </p>
              <p className={`text-sm ${isFeatureAtiva('financeiro') ? 'text-pink-700' : 'text-gray-400 line-through'}`}>
                Contas{!isFeatureAtiva('financeiro') && segmentoId ? ' (desabilitada)' : ''}
              </p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isFeatureAtiva('caixa') ? 'bg-yellow-50' : 'bg-gray-100 opacity-50'}`}>
              <p className={`text-2xl font-bold ${isFeatureAtiva('caixa') ? 'text-yellow-600' : 'text-gray-400'}`}>
                {isFeatureAtiva('caixa') ? '20' : '—'}
              </p>
              <p className={`text-sm ${isFeatureAtiva('caixa') ? 'text-yellow-700' : 'text-gray-400 line-through'}`}>
                Sessões Caixa{!isFeatureAtiva('caixa') && segmentoId ? ' (desabilitada)' : ''}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-600">100</p>
              <p className="text-sm text-gray-700">Logs</p>
            </div>
          </div>
          <p className="text-center mt-4 text-sm text-muted-foreground">
            {segmentoId && secoesAtivas.length > 0 ? (
              <span>Valores ajustados pelo segmento selecionado — seções desabilitadas não geram dados</span>
            ) : (
              <><strong>Total: ~{numVendas + 350} lançamentos</strong> distribuídos no período selecionado</>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
